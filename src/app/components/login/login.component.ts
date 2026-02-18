import { Component, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { GeolocationService, UserLocation } from '../../services/geolocation.service';
import { ApiService, Plant } from '../../services/api.service';
import { EnvironmentService, ApiEnvironment } from '../../services/environment.service';

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
  selectedPlantText: string = '';
  siteWarning: string = '';

  // Environment selection properties
  environments: ApiEnvironment[] = [];
  selectedEnvironment: string = 'live';
  showSettings: boolean = false;

  constructor(
    private router: Router,
    private authService: AuthService,
    private geolocationService: GeolocationService,
    private apiService: ApiService,
    private environmentService: EnvironmentService
  ) {}

  ngOnInit() {
    console.log('🚀 LoginComponent ngOnInit started');
    
    // Initialize environments and ALWAYS set to LIVE by default
    this.environments = this.environmentService.getEnvironments();
    
    // Force set to LIVE environment on every login page load
    this.environmentService.setEnvironment('live');
    this.selectedEnvironment = 'live';
    
    console.log('🌍 Environment forced to LIVE on login');
    console.log('🌍 Available environments:', this.environments);
    
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

      this.autoSelectSite();

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
      console.log('🔐 Starting login process with:', {
        empCode: this.empCode.trim(),
        site: this.site.trim(),
        location: this.currentLocation
      });

      const result = await this.authService.loginWithLocation(
        this.empCode.trim(), 
        this.site.trim(),
        this.currentLocation
      );
      
      console.log('🔐 Login result:', result);
      
      if (result.success) {
        console.log('✅ Login successful, redirecting to landing page');
        // Redirect ke landing page
        this.router.navigate(['/landing']);
      } else {
        console.log('❌ Login failed:', result.message);
        this.errorMessage = result.message || 'Login gagal. Silakan coba lagi.';
        
        // Add specific styling for location-related errors
        if (result.message && (
          result.message.includes('Lokasi tidak sesuai') || 
          result.message.includes('location') ||
          result.message.includes('site')
        )) {
          console.log('🗺️ Location-related error detected');
        }
      }
      
    } catch (error) {
      console.error('💥 Unexpected login error:', error);
      this.errorMessage = 'Terjadi kesalahan yang tidak terduga. Silakan coba lagi.';
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
      
      const response = await firstValueFrom(this.apiService.getPlantList());
      
      // Handle different response structures
      if (response) {
        if (response.Result && response.Result.Plant && Array.isArray(response.Result.Plant)) {
          this.plants = response.Result.Plant.sort((a: Plant, b: Plant) => {
            // Sort by Name alphabetically (ascending)
            return a.Name.localeCompare(b.Name);
          });
        } else {
          this.plants = [];
        }
        
        console.log('🏭 Plants loaded count:', this.plants.length);
        console.log('🏭 Plants data:', this.plants);

        this.autoSelectSite();
      } else {
        console.log('🏭 No response received');
        this.plants = [];
      }
      
    } catch (error) {
      this.plants = [];
    } finally {
      this.plantsLoading = false;
      console.log('🏭 loadPlantList() completed, plantsLoading set to false');
    }
  }

  autoSelectSite() {
    console.log('📍 autoSelectSite() called', {
      hasLocation: !!this.currentLocation,
      plantsCount: this.plants.length,
      currentSite: this.site
    });

    if (!this.currentLocation || this.plants.length === 0) {
      console.log('📍 Skipped: waiting for data');
      return;
    }

    if (this.site) {
      console.log('📍 Skipped: site already selected');
      return;
    }

    // Log first plant to check field names
    if (this.plants.length > 0) {
      console.log('📍 Sample plant data:', JSON.stringify(this.plants[0]));
    }

    let closestPlant: Plant | null = null;
    let closestDistance = Infinity;

    for (const plant of this.plants) {
      if (plant.Lat == null || plant.Long == null) continue;
      const dist = this.calculateDistance(
        this.currentLocation.latitude,
        this.currentLocation.longitude,
        plant.Lat,
        plant.Long
      );
      if (dist < closestDistance) {
        closestDistance = dist;
        closestPlant = plant;
      }
    }

    if (closestPlant && closestDistance <= 1) {
      console.log(`📍 Auto-selecting site: ${closestPlant.Name} (${closestDistance.toFixed(2)} km)`);
      this.siteWarning = '';
      this.selectSite(closestPlant.Plant, `${closestPlant.Plant} - ${closestPlant.Name}`);
    } else {
      console.log(`📍 No site within 1 km. Closest: ${closestDistance.toFixed(2)} km`);
      this.siteWarning = closestPlant
        ? `Tidak ada site dalam radius 1 km. Site terdekat: ${closestPlant.Name} (${closestDistance.toFixed(1)} km)`
        : 'Tidak ada data koordinat site yang tersedia';
    }
  }

  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
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
    return this.selectedPlantText || 'Pilih Site';
  }

  // Settings toggle method  
  toggleSettings() {
    this.showSettings = !this.showSettings;
  }

  // Environment selection method
  selectEnvironment(envName: string) {
    console.log('🌍 Switching environment to:', envName);
    this.selectedEnvironment = envName;
    this.environmentService.setEnvironment(envName);
    
    // Reload plant list with new environment
    this.plants = [];
    this.site = '';
    this.selectedPlantText = '';
    this.loadPlantList();
    
    // Hide settings after selection
    this.showSettings = false;
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
