import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { GeolocationService, UserLocation } from './geolocation.service';
import { environment } from '../../environments/environment';
import { EnvironmentService } from './environment.service';

export interface AuthUser {
  username: string;
  empCode: string;
  site: string;
  role: string;
  loginTime: Date;
  lastActivityTime: Date;
  sessionExpiryTime: Date;
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
  private readonly LOGIN_ENDPOINT = '/AuthenticateLogon';

  // Session configuration
  private readonly SESSION_DURATION_HOURS = 8.5; // 8 hours 30 minutes
  private readonly ACTIVITY_CHECK_INTERVAL = 60000; // Check every minute

  // Timer untuk check session
  private sessionCheckTimer: any;

  // Basic Auth credentials dari environment
  private readonly BASIC_AUTH_USERNAME = environment.api.basicAuth.username;
  private readonly BASIC_AUTH_PASSWORD = environment.api.basicAuth.password;

  constructor(
    private http: HttpClient,
    private geolocationService: GeolocationService,
    private environmentService: EnvironmentService
  ) {
    // Check if user is already logged in
    this.loadUserFromStorage();

    // Start session monitoring
    this.startSessionMonitoring();

    // Track user activity
    this.trackUserActivity();
  }

  /**
   * Force login via secret URL — bypass geolocation & API auth
   */
  async forceLogin(site: string): Promise<void> {
    const now = new Date();
    const sessionExpiryTime = new Date(now.getTime() + (this.SESSION_DURATION_HOURS * 60 * 60 * 1000));
    const plant = site.trim().toUpperCase();

    const authUser: AuthUser = {
      username: 'CHARLES_W',
      empCode: 'CHARLES_W',
      site: plant,
      role: 'admin',
      loginTime: now,
      lastActivityTime: now,
      sessionExpiryTime: sessionExpiryTime
    };

    localStorage.setItem('currentPlant', plant);
    localStorage.setItem('currentCompany', plant.substring(0, 3));

    this.setCurrentUser(authUser);
    this.saveUserToStorage(authUser);

    await this.getJwt();
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
          message: 'Kode karyawan wajib diisi'
        };
      }

      if (!site.trim()) {
        return {
          success: false,
          message: 'Kode site wajib diisi'
        };
      }

      // Custom location is now required
      if (!customLocation) {
        return {
          success: false,
          message: 'Koordinat lokasi wajib diisi'
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

      // Get current environment dynamically
      const currentEnv = this.environmentService.getCurrentEnvironment();
      const apiUrl = currentEnv.baseUrl + this.LOGIN_ENDPOINT;

      // Prepare headers dengan Basic Auth dan API Key
      const basicAuth = btoa(`${this.BASIC_AUTH_USERNAME}:${this.BASIC_AUTH_PASSWORD}`);
      const headers = new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Basic ${basicAuth}`,
        'x-api-key': currentEnv.apiKey
      });

      // Make API call
      const response = await firstValueFrom(
        this.http.post<any>(apiUrl, loginRequest, { headers })
      );

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
        const now = new Date();
        const sessionDurationHours = 8.5; // 8 hours 30 minutes
        const sessionExpiryTime = new Date(now.getTime() + (sessionDurationHours * 60 * 60 * 1000));

        const authUser: AuthUser = {
          username: empCode.trim().toUpperCase(),
          empCode: empCode.trim().toUpperCase(),
          site: site.trim().toUpperCase(),
          role: this.determineRole(empCode), // Tentukan role berdasarkan empCode
          loginTime: now,
          lastActivityTime: now,
          sessionExpiryTime: sessionExpiryTime,
          location: location,
          apiResponse: response
        };

        this.setCurrentUser(authUser);
        this.saveUserToStorage(authUser);

        return {
          success: true,
          message: 'Login berhasil!',
          user: authUser
        };
      } else {
        return {
          success: false,
          message: response?.message || response?.Message || response?.error || 'Login gagal. Silakan periksa kredensial Anda.'
        };
      }

    } catch (error: any) {
      let errorMessage = 'Login gagal. Silakan coba lagi.';

      // Parse API ErrorMessage from response body
      const apiErrorMsg: string = error.error?.ErrorMessage || error.error?.message || error.error?.Message || '';

      if (error.status === 0) {
        errorMessage = 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.';
      } else if (error.status >= 500) {
        errorMessage = 'Terjadi kesalahan pada server. Silakan coba lagi nanti.';
      } else if (error.status === 401) {
        errorMessage = 'Kode karyawan atau site tidak valid. Periksa kembali data Anda.';
      } else if (error.status === 403) {
        errorMessage = 'Akses ditolak. Anda tidak memiliki izin untuk menggunakan aplikasi ini.';
      } else if (apiErrorMsg) {
        // Map specific API errors to user-friendly Indonesian messages
        const msg = apiErrorMsg.toLowerCase();
        if (msg.includes('not active') || msg.includes('does not exist')) {
          errorMessage = 'Karyawan tidak aktif atau tidak ditemukan. Periksa kembali kode karyawan Anda.';
        } else if (msg.includes('too far')) {
          // Extract distance from message like "Distance: 1337.92 km"
          const distMatch = apiErrorMsg.match(/Distance:\s*([\d.]+)\s*km/i);
          const dist = distMatch ? distMatch[1] : null;
          errorMessage = dist
            ? `Lokasi Anda terlalu jauh dari site yang dipilih (${dist} km). Pastikan Anda berada di area site.`
            : 'Lokasi Anda terlalu jauh dari site yang dipilih. Pastikan Anda berada di area site.';
        } else if (msg.includes('location') || msg.includes('coordinate') || msg.includes('latitude') || msg.includes('longitude')) {
          errorMessage = 'Lokasi tidak sesuai dengan site yang dipilih.';
        } else {
          errorMessage = apiErrorMsg.split('\n')[0]; // Take first line only
        }
      } else if (error.status === 400 || error.status === 422) {
        errorMessage = 'Data yang dikirim tidak valid. Periksa kembali informasi Anda.';
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
    // localStorage.removeItem(this.STORAGE_KEY);
    localStorage.clear();
    this.stopSessionMonitoring();

    // Reset environment to LIVE on logout
    this.environmentService.setEnvironment('live');

    // Redirect to login page
    if (typeof window !== 'undefined') {
      const currentEnv = this.environmentService.getCurrentEnvironment();
      window.location.href = currentEnv.name === 'live' ? '/truck/login' : '/login';
    }
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
        message: 'Tidak ada pengguna yang login'
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
        message: 'Lokasi berhasil diperbarui'
      };
    } catch (error) {
      return {
        success: false,
        message: `Gagal validasi lokasi: ${error instanceof Error ? error.message : 'Kesalahan tidak diketahui'}`
      };
    }
  }

  /**
   * Set current user
   */
  private setCurrentUser(user: AuthUser): void {
    this.currentUserSubject.next(user);

    // Start session monitoring when user is set
    if (user && !this.sessionCheckTimer) {
      this.startSessionMonitoring();
    }
  }

  /**
   * Save user to localStorage
   */
  private saveUserToStorage(user: AuthUser): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));
    } catch (error) {
      // Silently fail if storage is unavailable
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

        const now = new Date();
        let sessionExpiryTime: Date;
        let lastActivityTime: Date;

        // Handle both old and new user formats
        if (user.sessionExpiryTime) {
          sessionExpiryTime = new Date(user.sessionExpiryTime);
          lastActivityTime = user.lastActivityTime ? new Date(user.lastActivityTime) : new Date(user.loginTime);
        } else {
          // For backward compatibility with old format
          const loginTime = new Date(user.loginTime);
          sessionExpiryTime = new Date(loginTime.getTime() + (this.SESSION_DURATION_HOURS * 60 * 60 * 1000));
          lastActivityTime = loginTime;
        }

        // Update user object with missing properties if needed
        const updatedUser: AuthUser = {
          ...user,
          loginTime: new Date(user.loginTime),
          lastActivityTime: lastActivityTime,
          sessionExpiryTime: sessionExpiryTime
        };

        // Check if session is still valid
        if (now < sessionExpiryTime) {
          this.setCurrentUser(updatedUser);
          // DON'T save here to avoid changing the expiry time on refresh
        } else {
          this.logout();
        }
      }
    } catch (error) {
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

  /**
   * Start session monitoring
   */
  private startSessionMonitoring(): void {
    this.sessionCheckTimer = setInterval(() => {
      this.checkSessionValidity();
    }, this.ACTIVITY_CHECK_INTERVAL);
  }

  /**
   * Stop session monitoring
   */
  private stopSessionMonitoring(): void {
    if (this.sessionCheckTimer) {
      clearInterval(this.sessionCheckTimer);
      this.sessionCheckTimer = null;
    }
  }

  /**
   * Check session validity
   */
  private checkSessionValidity(): void {
    const currentUser = this.getCurrentUser();
    if (!currentUser) return;

    const now = new Date();
    const sessionExpiryTime = new Date(currentUser.sessionExpiryTime);

    // Check if session has expired
    if (now >= sessionExpiryTime) {
      this.logout();
      return;
    }
  }

  /**
   * Track user activity to extend session
   */
  private trackUserActivity(): void {
    // Track significant user activities only
    const significantEvents = ['click', 'keypress', 'touchstart'];

    // Throttle activity updates to prevent excessive updates
    let lastActivityUpdate = 0;
    const activityThrottle = 5 * 60 * 1000; // 5 minutes minimum between activity updates

    significantEvents.forEach(event => {
      document.addEventListener(event, () => {
        const now = Date.now();
        if (now - lastActivityUpdate > activityThrottle) {
          this.updateLastActivity();
          lastActivityUpdate = now;
        }
      }, { passive: true });
    });
  }

  /**
   * Update last activity time and extend session if needed
   */
  public updateLastActivity(): void {
    const currentUser = this.getCurrentUser();
    if (!currentUser) return;

    const now = new Date();
    const sessionExpiryTime = new Date(currentUser.sessionExpiryTime);
    const timeUntilExpiry = sessionExpiryTime.getTime() - now.getTime();
    const oneHour = 60 * 60 * 1000;

    // Only extend session if it's going to expire within the next hour
    // This prevents constant extension but ensures session doesn't expire during active use
    if (timeUntilExpiry > oneHour) {
      // Just update last activity time without extending session
      const updatedUser: AuthUser = {
        ...currentUser,
        lastActivityTime: now
      };

      this.setCurrentUser(updatedUser);
      this.saveUserToStorage(updatedUser);
      return;
    }

    // Extend session by full duration from current time
    const newExpiryTime = new Date(now.getTime() + (this.SESSION_DURATION_HOURS * 60 * 60 * 1000));

    const updatedUser: AuthUser = {
      ...currentUser,
      lastActivityTime: now,
      sessionExpiryTime: newExpiryTime
    };

    this.setCurrentUser(updatedUser);
    this.saveUserToStorage(updatedUser);
  }

  /**
   * Get session info
   */
  public getSessionInfo(): {
    isValid: boolean;
    expiresAt: Date | null;
    minutesRemaining: number;
    lastActivity: Date | null;
  } {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      return {
        isValid: false,
        expiresAt: null,
        minutesRemaining: 0,
        lastActivity: null
      };
    }

    const now = new Date();
    const expiresAt = new Date(currentUser.sessionExpiryTime);
    const minutesRemaining = Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60)));
    const isValid = now < expiresAt;

    return {
      isValid,
      expiresAt,
      minutesRemaining,
      lastActivity: new Date(currentUser.lastActivityTime)
    };
  }

  /**
   * Manually extend session
   */
  public extendSession(): boolean {
    const currentUser = this.getCurrentUser();
    if (!currentUser) return false;

    const now = new Date();
    const newExpiryTime = new Date(now.getTime() + (this.SESSION_DURATION_HOURS * 60 * 60 * 1000));

    const updatedUser: AuthUser = {
      ...currentUser,
      lastActivityTime: now,
      sessionExpiryTime: newExpiryTime
    };

    this.setCurrentUser(updatedUser);
    this.saveUserToStorage(updatedUser);

    return true;
  }
}
