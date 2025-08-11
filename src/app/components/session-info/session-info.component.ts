import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { SessionNotificationService, SessionNotification } from '../../services/session-notification.service';

@Component({
  selector: 'app-session-info',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="session-info" *ngIf="sessionInfo && sessionInfo.isValid && isAuthenticated">
      <div class="session-timer">
        <span class="session-time" [class.warning]="sessionInfo.minutesRemaining <= 30">
          ⏰ {{ formatTime(sessionInfo.minutesRemaining) }}
        </span>
      </div>
    </div>

    <!-- Session Notification Modal -->
    <div class="session-notification-overlay" *ngIf="currentNotification" (click)="dismissNotification()">
      <div class="session-notification" [ngClass]="currentNotification.type" (click)="$event.stopPropagation()">
        <div class="notification-header">
          <h3>{{ getNotificationTitle() }}</h3>
          <button class="close-btn" (click)="dismissNotification()">&times;</button>
        </div>
        <div class="notification-body">
          <p>{{ currentNotification.message }}</p>
          <div class="notification-actions" *ngIf="currentNotification.type === 'warning'">
            <button class="btn btn-primary" (click)="extendSession()">
              Perpanjang Sesi
            </button>
            <button class="btn btn-secondary" (click)="dismissNotification()">
              Nanti
            </button>
          </div>
          <div class="notification-actions" *ngIf="currentNotification.type === 'expired'">
            <button class="btn btn-primary" (click)="goToLogin()">
              Login Ulang
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./session-info.component.css']
})
export class SessionInfoComponent implements OnInit, OnDestroy {
  sessionInfo: any = null;
  currentNotification: SessionNotification | null = null;
  isAuthenticated = false;
  
  private sessionCheckInterval: any;
  private notificationSubscription: Subscription | null = null;
  private authSubscription: Subscription | null = null;

  constructor(
    private authService: AuthService,
    private sessionNotificationService: SessionNotificationService
  ) {}

  ngOnInit(): void {
    this.updateSessionInfo();
    
    // Update session info every minute
    this.sessionCheckInterval = setInterval(() => {
      this.updateSessionInfo();
    }, 60000);

    // Subscribe to authentication changes
    this.authSubscription = this.authService.currentUser$.subscribe(
      user => {
        this.isAuthenticated = user !== null;
        if (user) {
          this.updateSessionInfo();
        } else {
          // User logged out, clear session info
          this.sessionInfo = null;
          this.dismissNotification();
        }
      }
    );

    // Subscribe to session notifications
    this.notificationSubscription = this.sessionNotificationService.notification$.subscribe(
      notification => {
        this.currentNotification = notification;
        
        // Auto-dismiss info notifications after 3 seconds
        if (notification && notification.type === 'info') {
          setTimeout(() => {
            this.dismissNotification();
          }, 3000);
        }
      }
    );
  }

  ngOnDestroy(): void {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
    }
    
    if (this.notificationSubscription) {
      this.notificationSubscription.unsubscribe();
    }

    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  private updateSessionInfo(): void {
    if (this.isAuthenticated) {
      this.sessionInfo = this.authService.getSessionInfo();
    } else {
      this.sessionInfo = null;
    }
  }

  formatTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}j ${mins}m`;
    } else {
      return `${mins}m`;
    }
  }

  getNotificationTitle(): string {
    if (!this.currentNotification) return '';
    
    switch (this.currentNotification.type) {
      case 'warning':
        return 'Peringatan Sesi';
      case 'expired':
        return 'Sesi Berakhir';
      case 'info':
        return 'Informasi';
      default:
        return 'Notifikasi';
    }
  }

  extendSession(): void {
    if (this.authService.extendSession()) {
      this.updateSessionInfo();
      this.dismissNotification();
    }
  }

  dismissNotification(): void {
    this.sessionNotificationService.clearNotification();
  }

  goToLogin(): void {
    // Navigate to login page
    window.location.href = '/login';
  }
}
