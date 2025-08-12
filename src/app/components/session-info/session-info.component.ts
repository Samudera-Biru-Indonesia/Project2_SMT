import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-session-info',
  standalone: true,
  imports: [CommonModule],
  template:``,
  styleUrls: ['./session-info.component.css']
})
export class SessionInfoComponent implements OnInit, OnDestroy {
  sessionInfo: any = null;
  isAuthenticated = false;
  
  private sessionCheckInterval: any;
  private authSubscription: Subscription | null = null;

  constructor(
    private authService: AuthService
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
        }
      }
    );
  }

  ngOnDestroy(): void {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
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
}
