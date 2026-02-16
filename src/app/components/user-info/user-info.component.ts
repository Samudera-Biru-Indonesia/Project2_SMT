import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AuthUser } from '@shared/dto/auth.dto';
import { GeolocationService } from '../../services/geolocation.service';

@Component({
  selector: 'app-user-info',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="user-info-widget" *ngIf="currentUser">
      <div class="user-header">
        <div class="user-avatar">
          {{ getUserInitials() }}
        </div>
        <div class="user-details">
          <div class="user-name">{{ currentUser.username }}</div>
          <div class="user-role">{{ currentUser.role | titlecase }}</div>
        </div>
        <button class="logout-btn" (click)="logout()" title="Logout">
          🚪
        </button>
      </div>
      
      <div class="location-info" *ngIf="currentUser.allowedLocation">
        <div class="location-badge">
          📍 {{ currentUser.allowedLocation.name }}
        </div>
        <div class="login-time">
          Login: {{ formatLoginTime() }}
        </div>
      </div>
      
      <div class="actions">
        <button class="validate-btn" (click)="revalidateLocation()" [disabled]="isValidating">
          {{ isValidating ? '⏳' : '🔄' }} Validate Location
        </button>
      </div>
      
      <div class="validation-message" *ngIf="validationMessage" 
           [ngClass]="{'success': validationSuccess, 'error': !validationSuccess}">
        {{ validationMessage }}
      </div>
    </div>
  `,
  styles: [`
    .user-info-widget {
      background: white;
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      border: 1px solid #e9ecef;
      margin-bottom: 20px;
    }

    .user-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }

    .user-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 14px;
    }

    .user-details {
      flex: 1;
    }

    .user-name {
      font-weight: 600;
      color: #333;
      font-size: 16px;
    }

    .user-role {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .logout-btn {
      background: #dc3545;
      color: white;
      border: none;
      border-radius: 6px;
      width: 32px;
      height: 32px;
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 14px;
    }

    .logout-btn:hover {
      background: #c82333;
      transform: scale(1.05);
    }

    .location-info {
      margin-bottom: 12px;
    }

    .location-badge {
      background: linear-gradient(135deg, #28a745, #20c997);
      color: white;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      display: inline-block;
      margin-bottom: 4px;
    }

    .login-time {
      font-size: 11px;
      color: #666;
    }

    .actions {
      margin-bottom: 12px;
    }

    .validate-btn {
      background: linear-gradient(135deg, #17a2b8, #138496);
      color: white;
      border: none;
      border-radius: 6px;
      padding: 6px 12px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      width: 100%;
    }

    .validate-btn:hover:not(:disabled) {
      background: linear-gradient(135deg, #138496, #117a8b);
      transform: translateY(-1px);
    }

    .validate-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    .validation-message {
      padding: 8px;
      border-radius: 6px;
      font-size: 12px;
      text-align: center;
      font-weight: 500;
    }

    .validation-message.success {
      background: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }

    .validation-message.error {
      background: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }

    @media (max-width: 768px) {
      .user-info-widget {
        padding: 12px;
        margin-bottom: 16px;
      }
      
      .user-header {
        gap: 8px;
      }
      
      .user-avatar {
        width: 36px;
        height: 36px;
        font-size: 12px;
      }
      
      .user-name {
        font-size: 14px;
      }
    }
  `]
})
export class UserInfoComponent implements OnInit {
  currentUser: AuthUser | null = null;
  isValidating: boolean = false;
  validationMessage: string = '';
  validationSuccess: boolean = false;

  constructor(
    private authService: AuthService,
    private geolocationService: GeolocationService,
    private router: Router
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }

  getUserInitials(): string {
    if (!this.currentUser) return '';
    return this.currentUser.username.substring(0, 2).toUpperCase();
  }

  formatLoginTime(): string {
    if (!this.currentUser) return '';
    const loginTime = new Date(this.currentUser.loginTime);
    return loginTime.toLocaleTimeString('id-ID', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  async revalidateLocation() {
    this.isValidating = true;
    this.validationMessage = '';
    
    try {
      const result = await this.authService.revalidateLocation();
      this.validationMessage = result.message;
      this.validationSuccess = result.success;
      
      if (!result.success) {
        // Auto logout setelah 3 detik jika validasi gagal
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 3000);
      }
    } catch (error) {
      this.validationMessage = 'Error validating location';
      this.validationSuccess = false;
    } finally {
      this.isValidating = false;
      
      // Clear message setelah 5 detik
      setTimeout(() => {
        this.validationMessage = '';
      }, 5000);
    }
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
