import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { GeolocationService, UserLocation } from './geolocation.service';
import { environment } from '../../environments/environment';

export interface AuthUser {
  username: string;
  empCode: string;
  site: string;
  role: string;
  loginTime: Date;
  location?: UserLocation;
  apiResponse?: any;
}

export interface LoginRequest {
  logonSite: string;
  logonEMP: string;
  curLatitude: number;
  curLongitude: number;
}

export interface LoginResponse {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<AuthUser | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private readonly STORAGE_KEY = 'smt_auth_user';
  private readonly API_URL = `${environment.api.baseUrl}${environment.api.endpoints.login}`;
  private readonly API_KEY = environment.api.apiKey;
  
  // Basic Auth credentials dari environment
  private readonly BASIC_AUTH_USERNAME = environment.api.basicAuth.username;
  private readonly BASIC_AUTH_PASSWORD = environment.api.basicAuth.password;

  constructor(
    private http: HttpClient,
    private geolocationService: GeolocationService
  ) {
    // Check if user is already logged in
    this.loadUserFromStorage();
  }

  /**
   * Login dengan API Samator
   */
  async login(empCode: string, site: string): Promise<{ success: boolean; message: string; user?: AuthUser }> {
    return this.loginWithLocation(empCode, site);
  }

  /**
   * Login dengan custom location atau auto-detect location
   */
  async loginWithLocation(empCode: string, site: string, customLocation?: UserLocation): Promise<{ success: boolean; message: string; user?: AuthUser }> {
    try {
      // Validasi input
      if (!empCode.trim()) {
        return {
          success: false,
          message: 'Employee code is required'
        };
      }

      if (!site.trim()) {
        return {
          success: false,
          message: 'Site code is required'
        };
      }

      // Custom location is now required
      if (!customLocation) {
        return {
          success: false,
          message: 'Location coordinates are required'
        };
      }

      const location = customLocation;

      // Prepare request body
      const loginRequest: LoginRequest = {
        logonSite: site.trim().toUpperCase(),
        logonEMP: empCode.trim().toUpperCase(),
        curLatitude: location.latitude,
        curLongitude: location.longitude
      };

      console.log('Login Request:', loginRequest);

      // Prepare headers dengan Basic Auth dan API Key
      const basicAuth = btoa(`${this.BASIC_AUTH_USERNAME}:${this.BASIC_AUTH_PASSWORD}`);
      const headers = new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Basic ${basicAuth}`,
        'X-API-Key': this.API_KEY
      });

      console.log('Request Headers:', {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${basicAuth}`,
        'X-API-Key': this.API_KEY
      });

      console.log('API URL:', this.API_URL);

      // Make API call
      const response = await firstValueFrom(
        this.http.post<any>(this.API_URL, loginRequest, { headers })
      );

      console.log('API Response:', response);

      // Check if login successful
      // API Samator mengembalikan {} (empty object) jika login berhasil
      // atau bisa jadi response dengan success: true atau Success: true
      const isLoginSuccessful = response !== null && response !== undefined && (
        // Check untuk empty object {} - ini yang terjadi di API Samator
        (typeof response === 'object' && Object.keys(response).length === 0) ||
        // Check untuk response dengan success flag
        response.success === true || 
        response.Success === true || 
        response.status === 'success' ||
        response.Status === 'success'
      );

      if (isLoginSuccessful) {
        // Login berhasil
        const authUser: AuthUser = {
          username: empCode.trim().toUpperCase(),
          empCode: empCode.trim().toUpperCase(),
          site: site.trim().toUpperCase(),
          role: this.determineRole(empCode), // Tentukan role berdasarkan empCode
          loginTime: new Date(),
          location: location,
          apiResponse: response
        };

        this.setCurrentUser(authUser);
        this.saveUserToStorage(authUser);

        console.log('Login successful! User authenticated:', authUser);

        return {
          success: true,
          message: 'Login successful!',
          user: authUser
        };
      } else {
        console.log('Login failed. Response does not indicate success:', response);
        return {
          success: false,
          message: response?.message || response?.Message || response?.error || 'Login failed. Please check your credentials.'
        };
      }

    } catch (error: any) {
      console.error('Login error:', error);
      
      let errorMessage = 'Login failed. Please try again.';
      
      if (error.status === 401) {
        errorMessage = 'Invalid credentials. Please check your employee code and site.';
      } else if (error.status === 403) {
        errorMessage = 'Access denied. You are not authorized to use this application.';
      } else if (error.status === 0) {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (error.error?.message || error.error?.Message) {
        errorMessage = error.error.message || error.error.Message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        message: errorMessage
      };
    }
  }

  /**
   * Tentukan role berdasarkan empCode
   */
  private determineRole(empCode: string): string {
    // Implementasi sederhana untuk menentukan role
    // Anda bisa menyesuaikan logic ini sesuai dengan aturan perusahaan
    if (empCode.includes('SUP') || empCode.includes('MGR')) {
      return 'supervisor';
    } else if (empCode.includes('ADM')) {
      return 'admin';
    } else {
      return 'driver';
    }
  }

  /**
   * Logout
   */
  logout(): void {
    this.currentUserSubject.next(null);
    localStorage.removeItem(this.STORAGE_KEY);
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.currentUserSubject.value !== null;
  }

  /**
   * Get current user
   */
  getCurrentUser(): AuthUser | null {
    return this.currentUserSubject.value;
  }

  /**
   * Revalidate location - optional untuk check lokasi lagi
   */
  async revalidateLocation(): Promise<{ success: boolean; message: string }> {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        message: 'No user logged in'
      };
    }

    try {
      const location = await this.geolocationService.getCurrentLocation();
      
      // Update user location
      const updatedUser: AuthUser = {
        ...currentUser,
        location: location
      };
      
      this.setCurrentUser(updatedUser);
      this.saveUserToStorage(updatedUser);
      
      return {
        success: true,
        message: 'Location updated successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: `Location validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Set current user
   */
  private setCurrentUser(user: AuthUser): void {
    this.currentUserSubject.next(user);
  }

  /**
   * Save user to localStorage
   */
  private saveUserToStorage(user: AuthUser): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Error saving user to storage:', error);
    }
  }

  /**
   * Load user from localStorage
   */
  private loadUserFromStorage(): void {
    try {
      const storedUser = localStorage.getItem(this.STORAGE_KEY);
      if (storedUser) {
        const user: AuthUser = JSON.parse(storedUser);
        // Check if login is still valid (e.g., not expired)
        const loginTime = new Date(user.loginTime);
        const now = new Date();
        const hoursSinceLogin = (now.getTime() - loginTime.getTime()) / (1000 * 60 * 60);
        
        // Auto logout after 8 hours
        if (hoursSinceLogin < 8) {
          this.setCurrentUser(user);
        } else {
          this.logout();
        }
      }
    } catch (error) {
      console.error('Error loading user from storage:', error);
      this.logout();
    }
  }

  /**
   * Get user role
   */
  getUserRole(): string | null {
    const user = this.getCurrentUser();
    return user ? user.role : null;
  }

  /**
   * Check if user has specific role
   */
  hasRole(role: string): boolean {
    const userRole = this.getUserRole();
    return userRole === role;
  }

  /**
   * Check if user has any of the specified roles
   */
  hasAnyRole(roles: string[]): boolean {
    const userRole = this.getUserRole();
    return userRole ? roles.includes(userRole) : false;
  }

  /**
   * Get current user's employee code
   */
  getEmployeeCode(): string | null {
    const user = this.getCurrentUser();
    return user ? user.empCode : null;
  }

  /**
   * Get current user's site
   */
  getSite(): string | null {
    const user = this.getCurrentUser();
    return user ? user.site : null;
  }
}
