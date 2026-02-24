import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: number;
}

@Injectable({
  providedIn: 'root'
})
export class GeolocationService {
  private currentLocationSubject = new BehaviorSubject<UserLocation | null>(null);
  public currentLocation$ = this.currentLocationSubject.asObservable();

  constructor() { }

  /**
   * Mendapatkan lokasi pengguna saat ini
   */
  getCurrentLocation(): Promise<UserLocation> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolokasi tidak didukung oleh browser ini.'));
        return;
      }

      const options = {
        enableHighAccuracy: true,
        timeout: 30000, // Increase timeout dramatically
        maximumAge: 0 // Always get fresh coordinates, no caching
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLocation: UserLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          };

          this.currentLocationSubject.next(userLocation);
          resolve(userLocation);
        },
        (error) => {
          let errorMessage = 'Terjadi kesalahan yang tidak diketahui';

          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Pengguna menolak permintaan akses lokasi.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Informasi lokasi tidak tersedia.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Permintaan lokasi pengguna telah habis waktu.';
              break;
          }

          reject(new Error(errorMessage));
        },
        options
      );
    });
  }

  /**
   * Watch position secara real-time (opsional)
   */
  watchPosition(): Observable<UserLocation> {
    return new Observable(observer => {
      if (!navigator.geolocation) {
        observer.error('Geolokasi tidak didukung oleh browser ini.');
        return;
      }

      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const userLocation: UserLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          };

          this.currentLocationSubject.next(userLocation);
          observer.next(userLocation);
        },
        (error) => {
          observer.error(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );

      // Cleanup function
      return () => {
        navigator.geolocation.clearWatch(watchId);
      };
    });
  }
}
