import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { EnvironmentIndicatorComponent } from '../environment-indicator/environment-indicator.component';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, EnvironmentIndicatorComponent],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.css']
})
export class LandingComponent implements OnInit {
  currentTime: string = '';
  currentUser: string = 'Pengguna';

  constructor(
    private router: Router,
    private authService: AuthService
  ) {
    this.updateTime();
    setInterval(() => this.updateTime(), 1000);
  }

  ngOnInit() {
    // Get current user info
    const user = this.authService.getCurrentUser();
    if (user) {
      this.currentUser = user.empCode || user.username;
    } else {
      // If no user logged in, redirect to login
      this.router.navigate(['/login']);
    }
  }

  updateTime() {
    const now = new Date();
    this.currentTime = now.toLocaleString();
  }

  goToScanBarcode() {
    this.router.navigate(['/scan-barcode']);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
