import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { GeolocationService, UserLocation } from '../../services/geolocation.service';

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

  constructor(
    private router: Router,
    private authService: AuthService,
    private geolocationService: GeolocationService
  ) {}

  ngOnInit() {
    this.getCurrentLocation();
  }

  async getCurrentLocation() {
    this.locationLoading = true;
    this.errorMessage = '';

    try {
      this.currentLocation = await this.geolocationService.getCurrentLocation();
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

  formatCoordinate(coord: number): string {
    return coord.toFixed(6);
  }
}
