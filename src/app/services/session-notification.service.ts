import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface SessionNotification {
  type: 'warning' | 'info' | 'expired';
  message: string;
  minutesRemaining?: number;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class SessionNotificationService {
  private notificationSubject = new BehaviorSubject<SessionNotification | null>(null);
  public notification$ = this.notificationSubject.asObservable();

  constructor() {}

  /**
   * Show session warning
   */
  showSessionWarning(minutesRemaining: number): void {
    const notification: SessionNotification = {
      type: 'warning',
      message: `Sesi Anda akan berakhir dalam ${minutesRemaining} menit. Lakukan aktivitas untuk memperpanjang sesi.`,
      minutesRemaining,
      timestamp: new Date()
    };
    
    this.notificationSubject.next(notification);
  }

  /**
   * Show session expired
   */
  showSessionExpired(): void {
    const notification: SessionNotification = {
      type: 'expired',
      message: 'Sesi Anda telah berakhir. Silakan login kembali.',
      timestamp: new Date()
    };
    
    this.notificationSubject.next(notification);
  }

  /**
   * Show session extended
   */
  showSessionExtended(): void {
    const notification: SessionNotification = {
      type: 'info',
      message: 'Sesi Anda telah diperpanjang.',
      timestamp: new Date()
    };
    
    this.notificationSubject.next(notification);
  }

  /**
   * Clear notification
   */
  clearNotification(): void {
    this.notificationSubject.next(null);
  }

  /**
   * Get current notification
   */
  getCurrentNotification(): SessionNotification | null {
    return this.notificationSubject.value;
  }
}
