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
  password: string = '';
  showPassword: boolean = false;
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
  siteSearchQuery: string = '';

  // Environment selection properties
  environments: ApiEnvironment[] = [];
  selectedEnvironment: string = 'live';
  showSettings: boolean = false;

  // Role
  role: string = '';

  constructor(
    private router: Router,
    private authService: AuthService,
    private geolocationService: GeolocationService,
    private apiService: ApiService,
    private environmentService: EnvironmentService
  ) {}

  ngOnInit() {
    
    this.authService.logout(false);

    this.environments = this.environmentService.getEnvironments();
    this.environmentService.setEnvironment('live');
    this.selectedEnvironment = 'live';
    // this.role = localStorage.getItem('savedRole') || '';

    // // setRole to set up the default display
    // if (this.role.trim()) {
    //   this.setRole(this.role);
    // }
    const savedEmpCode = localStorage.getItem('lastLoginEmpCode');
    if (savedEmpCode) {
      this.empCode = savedEmpCode;
    }
  }

  async getCurrentLocation() {
    this.locationLoading = true;
    this.errorMessage = '';

    try {
      const location = await this.geolocationService.getCurrentLocation();
      this.currentLocation = location;
      this.autoSelectSite(this.role);
    } catch (error) {
      this.errorMessage = 'Tidak dapat mendeteksi lokasi. Silakan buka pengaturan browser → izin situs → lokasi, lalu aktifkan untuk situs ini dan coba lagi.';
    } finally {
      this.locationLoading = false;
    }
  }

  async onLogin() {
    this.errorMessage = '';

    if (!this.empCode.trim()) {
      this.errorMessage = 'Silakan masukkan kode karyawan Anda';
      return;
    }

    if (this.role === 'admin' && !this.password.trim()) {
      this.errorMessage = 'Silakan masukkan password Anda';
      return;
    }

    if (!this.site.trim()) {
      this.errorMessage = 'Silakan masukkan kode site';
      return;
    }

    if (this.role === 'satpam' && !this.currentLocation) {
      this.errorMessage = 'Lokasi belum terdeteksi. Silakan tunggu atau refresh halaman.';
      this.getCurrentLocation()
      return;
    }

    this.isLoading = true;


    if (this.role === 'satpam') {
      try {
        const result = await this.authService.loginWithLocation(
          this.empCode.trim(),
          this.site.trim(),
          this.currentLocation || undefined
        );

        if (result.success) {
          // Set all localStorage items synchronously
          const plant = this.site.trim().toUpperCase();
          const company = plant.substring(0, 3);
          
          localStorage.setItem('lastLoginSite', this.site.trim());
          localStorage.setItem('lastLoginEmpCode', this.empCode.trim());
          localStorage.setItem('savedRole', this.role.trim());
          localStorage.setItem('currentPlant', plant);
          localStorage.setItem('currentCompany', company);
          
          // Wait a tick to ensure localStorage is committed
          await new Promise(resolve => setTimeout(resolve, 0));
          
          this.router.navigate(['/trip-selection']);
        } else {
          this.errorMessage = result.message || 'Login gagal. Silakan coba lagi.';
        }

      } catch (error) {
        this.errorMessage = 'Terjadi kesalahan yang tidak terduga. Silakan coba lagi.';
      } finally {
        this.isLoading = false;
      }
    } else if (this.role === 'admin') {

      const result = await this.authService.loginAsAdmin(this.empCode.trim(), this.password.trim(), this.site.trim());

      if (result.success) {
        const plant = this.site.trim().toUpperCase();
        const company = plant.substring(0, 3);

        localStorage.setItem('lastLoginSite', this.site.trim());
        localStorage.setItem('lastLoginEmpCode', this.empCode.trim());
        localStorage.setItem('currentPlant', plant);
        localStorage.setItem('currentCompany', company);
        localStorage.setItem('adminCode', this.empCode.trim());
        localStorage.setItem('savedRole', this.role.trim());

        await new Promise(resolve => setTimeout(resolve, 0));

        this.router.navigate(['/admin/report']);
      } else {
        this.errorMessage = result.message;
      }

      this.isLoading = false;


    } else {
      this.role = '';
      this.isLoading = false;
      alert('Mohon pilih hak akses.');
    }
  }

  refreshLocation() {
    this.getCurrentLocation();
  }

  async loadPlantList() {
    this.plantsLoading = true;

    try {
      const response = await firstValueFrom(this.apiService.getPlantList());

      if (response) {
        if (response.Result && response.Result.Plant && Array.isArray(response.Result.Plant)) {
          this.plants = response.Result.Plant.sort((a: Plant, b: Plant) => {
            return a.Name.localeCompare(b.Name);
          });
        } else {
          this.plants = [];
        }

      } else {
        this.plants = [];
      }

      // Auto-select saved site for admin after plants are loaded
      if (this.role === 'admin') {
        const savedSite = localStorage.getItem('lastLoginSite');
        if (savedSite) {
          this.setSiteIfExists(savedSite);
        }
      }

    } catch (error) {
      this.plants = [];
    } finally {
      this.plantsLoading = false;
    }
  }

  autoSelectSite(role: string) {

    if (role === 'admin') {

      const savedSite = localStorage.getItem('lastLoginSite');
      if (savedSite) {
        this.setSiteIfExists(savedSite);
      } else {
        // If no saved site, show all plants
        this.site = '';
        this.selectedPlantText = '';
      }


      return;
    }

    if (!this.currentLocation || this.plants.length === 0) {
      return;
    }

    const accessiblePlants = this.accessiblePlants;
    if (accessiblePlants.length === 0) {
      this.siteWarning = 'Tidak ada site dalam radius 1 km';
      return;
    }

    // Check if already selected
    if (this.site) {
      return;
    }

    // Try to use saved site from localStorage if it exists in accessible plants
    const savedSite = localStorage.getItem('lastLoginSite');
    const savedPlantExists = accessiblePlants.find(p => p.Plant === savedSite);
    
    if (savedSite && savedPlantExists) {
      this.selectSite(savedPlantExists.Plant, savedPlantExists.Name);
      this.siteWarning = '';
      return;
    }

    // Otherwise, set to first accessible plant
    this.selectSite(accessiblePlants[0].Plant, accessiblePlants[0].Name);
    this.siteWarning = '';
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

  // Returns only plants within 1 km of current location (or all if no location yet)
  get accessiblePlants(): Plant[] {
    if (!this.currentLocation || this.plants.length === 0) {
      return this.plants;
    }
    return this.plants.filter(plant => {
      if (plant.Lat == null || plant.Long == null) return false;
      return this.calculateDistance(
        this.currentLocation!.latitude,
        this.currentLocation!.longitude,
        plant.Lat,
        plant.Long
      ) <= 1;
    });
  }

  get filteredAccessiblePlants(): Plant[] {
    if (!this.siteSearchQuery.trim()) return this.accessiblePlants;
    const q = this.siteSearchQuery.trim().toUpperCase();
    return this.accessiblePlants.filter(plant => 
      plant.Plant.toUpperCase().includes(q) || 
      plant.Name.toUpperCase().includes(q)
    );
  }

  get filteredPlants(): Plant[] {
    if (!this.siteSearchQuery.trim()) return this.plants;
    const q = this.siteSearchQuery.trim().toUpperCase();
    return this.plants.filter(plant => 
      plant.Plant.toUpperCase().includes(q) || 
      plant.Name.toUpperCase().includes(q)
    );
  }

  // Custom dropdown methods
  toggleDropdown() {
    this.dropdownOpen = !this.dropdownOpen;
    if (this.dropdownOpen) this.siteSearchQuery = '';
  }

  selectSite(plantCode: string, displayText: string) {
    this.site = plantCode;
    this.selectedPlantText = displayText;
    this.dropdownOpen = false;
  }

  setSiteIfExists(plantCode: string) {
    // For satpam, only select if plant is accessible (within 1km)
    if (this.role === 'satpam') {
      const accessiblePlant = this.accessiblePlants.find(p => p.Plant === plantCode);
      if (accessiblePlant) {
        this.selectSite(accessiblePlant.Plant, accessiblePlant.Name);
      }
    } else {
      // For admin, select from all plants
      const plant = this.plants.find(p => p.Plant === plantCode);
      if (plant) {
        this.selectSite(plant.Plant, plant.Name);
      }
    }
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



  setRole(role: string) {
    this.role = role;
    this.password = ''; // Clear password when switching roles
    this.showPassword = false; // Reset password visibility

    // Clear current site selection when switching roles
    this.site = '';
    this.selectedPlantText = '';

    this.loadPlantList();

    if (role === 'satpam') {
      this.getCurrentLocation();
    } else {
      this.currentLocation = null;
    }

    localStorage.setItem('savedRole', role);
    
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  delRole() {
    this.role = '';
  }
}
