import { Component, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { GeolocationService, UserLocation } from '../../services/geolocation.service';
import { ApiService, Plant } from '../../services/api.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  empCode: string = '';
  site: string = '';
  isLoading: boolean = false;
  errorMessage: string = '';
  currentLocation: UserLocation | null = null;
  locationLoading: boolean = false;
  
  // Plant list properties
  plants: Plant[] = [];
  plantsLoading: boolean = false;
  
  // Custom dropdown properties
  dropdownOpen: boolean = false;
  selectedPlantText: string = 'Pilih Site';

  constructor(
    private router: Router,
    private authService: AuthService,
    private geolocationService: GeolocationService,
    private apiService: ApiService
  ) {}

  ngOnInit() {
    console.log('🚀 LoginComponent ngOnInit started');
    this.getCurrentLocation();
    console.log('🏭 About to call loadPlantList()');
    this.loadPlantList();
  }

  async getCurrentLocation() {
    this.locationLoading = true;
    this.errorMessage = '';

    try {
      // Try multiple attempts to get better accuracy
      let bestLocation = await this.geolocationService.getCurrentLocation();
      console.log('🗺️ GPS Location attempt 1:', {
        latitude: bestLocation.latitude,
        longitude: bestLocation.longitude,
        accuracy: bestLocation.accuracy,
        timestamp: new Date(bestLocation.timestamp || Date.now())
      });

      // If accuracy is poor (> 100m), try again
      if (bestLocation.accuracy && bestLocation.accuracy > 100) {
        console.log('🔄 Accuracy poor (' + bestLocation.accuracy + 'm), trying again...');
        
        try {
          const secondAttempt = await this.geolocationService.getCurrentLocation();
          console.log('🗺️ GPS Location attempt 2:', {
            latitude: secondAttempt.latitude,
            longitude: secondAttempt.longitude,
            accuracy: secondAttempt.accuracy,
            timestamp: new Date(secondAttempt.timestamp || Date.now())
          });

          // Use better accuracy result
          if (secondAttempt.accuracy && secondAttempt.accuracy < bestLocation.accuracy!) {
            console.log('✅ Second attempt better, using that');
            bestLocation = secondAttempt;
          } else {
            console.log('⚠️ First attempt still better');
          }
        } catch (error) {
          console.log('❌ Second attempt failed, using first result');
        }
      }

      this.currentLocation = bestLocation;
      
      // Final result log
      console.log('🎯 FINAL Location selected:', {
        latitude: this.currentLocation.latitude,
        longitude: this.currentLocation.longitude,
        accuracy: this.currentLocation.accuracy,
        accuracyLevel: this.currentLocation.accuracy! > 1000 ? 'VERY LOW' : 
                      this.currentLocation.accuracy! > 100 ? 'LOW' : 
                      this.currentLocation.accuracy! > 50 ? 'MEDIUM' : 'HIGH'
      });

    } catch (error) {
      console.error('Error getting location:', error);
      this.errorMessage = 'Tidak dapat mendeteksi lokasi. Pastikan akses lokasi diizinkan di browser Anda.';
    } finally {
      this.locationLoading = false;
    }
  }

  async onLogin() {
    this.errorMessage = '';

    // Validasi input
    if (!this.empCode.trim()) {
      this.errorMessage = 'Silakan masukkan kode karyawan Anda';
      return;
    }

    if (!this.site.trim()) {
      this.errorMessage = 'Silakan masukkan kode site';
      return;
    }

    if (!this.currentLocation) {
      this.errorMessage = 'Lokasi belum terdeteksi. Silakan tunggu atau refresh halaman.';
      return;
    }

    this.isLoading = true;

    try {
      const result = await this.authService.loginWithLocation(
        this.empCode.trim(), 
        this.site.trim(),
        this.currentLocation
      );
      
      if (result.success) {
        // Redirect ke landing page
        this.router.navigate(['/landing']);
      } else {
        this.errorMessage = result.message || 'Login gagal. Silakan coba lagi.';
      }
      
    } catch (error) {
      this.errorMessage = 'Terjadi kesalahan yang tidak terduga. Silakan coba lagi.';
      console.error('Login error:', error);
    } finally {
      this.isLoading = false;
    }
  }

  refreshLocation() {
    this.getCurrentLocation();
  }

  async loadPlantList() {
    this.plantsLoading = true;
    console.log('🏭 Starting loadPlantList() function');
    
    try {
      console.log('🏭 Loading plant list...');
      console.log('🏭 Calling API service getPlantList()');
      
      const response = await firstValueFrom(this.apiService.getPlantList());
      
      console.log('🏭 Plant list response received:', response);
      console.log('🏭 Response type:', typeof response);
      console.log('🏭 Response is array?:', Array.isArray(response));
      
      // Log the Result object if it exists
      if (response && response.Result) {
        console.log('🏭 Response.Result:', response.Result);
        console.log('🏭 Response.Result type:', typeof response.Result);
        console.log('🏭 Response.Result is array?:', Array.isArray(response.Result));
        console.log('🏭 Response.Result keys:', Object.keys(response.Result));
      }
      
      // Handle different response structures
      if (response) {
        if (response.Result && response.Result.Plant && Array.isArray(response.Result.Plant)) {
          this.plants = response.Result.Plant.sort((a: Plant, b: Plant) => {
            // Sort by Plant code first, then by Name
            if (a.Plant < b.Plant) return -1;
            if (a.Plant > b.Plant) return 1;
            return a.Name.localeCompare(b.Name);
          });
          console.log('🏭 Using response.Result.Plant array (sorted)');
        } else if (Array.isArray(response)) {
          this.plants = response.sort((a: Plant, b: Plant) => {
            if (a.Plant < b.Plant) return -1;
            if (a.Plant > b.Plant) return 1;
            return a.Name.localeCompare(b.Name);
          });
          console.log('🏭 Using response directly as array (sorted)');
        } else if (response.Result && Array.isArray(response.Result)) {
          this.plants = response.Result.sort((a: Plant, b: Plant) => {
            if (a.Plant < b.Plant) return -1;
            if (a.Plant > b.Plant) return 1;
            return a.Name.localeCompare(b.Name);
          });
          console.log('🏭 Using response.Result array (sorted)');
        } else if (response.plants && Array.isArray(response.plants)) {
          this.plants = response.plants.sort((a: Plant, b: Plant) => {
            if (a.Plant < b.Plant) return -1;
            if (a.Plant > b.Plant) return 1;
            return a.Name.localeCompare(b.Name);
          });
          console.log('🏭 Using response.plants array (sorted)');
        } else if (response.data && Array.isArray(response.data)) {
          this.plants = response.data.sort((a: Plant, b: Plant) => {
            if (a.Plant < b.Plant) return -1;
            if (a.Plant > b.Plant) return 1;
            return a.Name.localeCompare(b.Name);
          });
          console.log('🏭 Using response.data array (sorted)');
        } else {
          console.log('🏭 Unexpected plant list response structure:', response);
          this.plants = [];
        }
        
        console.log('🏭 Plants loaded count:', this.plants.length);
        console.log('🏭 Plants data:', this.plants);
      } else {
        console.log('🏭 No response received');
        this.plants = [];
      }
      
    } catch (error) {
      console.error('❌ Error loading plant list:', error);
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        status: (error as any)?.status,
        statusText: (error as any)?.statusText,
        url: (error as any)?.url
      });
      this.plants = [];
      // Don't show error to user for plant list, keep text input as fallback
    } finally {
      this.plantsLoading = false;
      console.log('🏭 loadPlantList() completed, plantsLoading set to false');
    }
  }

  formatCoordinate(coord: number): string {
    return coord.toFixed(6);
  }

  // Custom dropdown methods
  toggleDropdown() {
    this.dropdownOpen = !this.dropdownOpen;
  }

  selectSite(plantCode: string, displayText: string) {
    this.site = plantCode;
    this.selectedPlantText = displayText;
    this.dropdownOpen = false;
  }

  getSelectedPlantText(): string {
    return this.selectedPlantText;
  }

  // Close dropdown when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.custom-dropdown')) {
      this.dropdownOpen = false;
    }
  }
}
