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
      console.log('🔍 Starting geolocation request...');
      
      if (!navigator.geolocation) {
        console.error('❌ Geolocation not supported');
        reject(new Error('Geolocation is not supported by this browser.'));
        return;
      }

      console.log('✅ Geolocation API available');

      const options = {
        enableHighAccuracy: true,
        timeout: 30000, // Increase timeout dramatically
        maximumAge: 0 // Always get fresh coordinates, no caching
      };

      console.log('⚙️ Geolocation options:', options);

      const startTime = Date.now();

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const endTime = Date.now();
          const responseTime = endTime - startTime;
          
          console.log('🎯 Geolocation SUCCESS:', {
            responseTime: responseTime + 'ms',
            coords: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              altitude: position.coords.altitude,
              altitudeAccuracy: position.coords.altitudeAccuracy,
              heading: position.coords.heading,
              speed: position.coords.speed
            },
            timestamp: new Date(position.timestamp),
            // Debug info tentang positioning source
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            onLine: navigator.onLine,
            geolocationEnabled: 'geolocation' in navigator
          });

          // Check accuracy level
          if (position.coords.accuracy > 1000) {
            console.warn('⚠️ LOW ACCURACY detected:', position.coords.accuracy + 'm');
          } else if (position.coords.accuracy > 100) {
            console.warn('⚠️ MEDIUM ACCURACY detected:', position.coords.accuracy + 'm');
          } else {
            console.log('✅ HIGH ACCURACY detected:', position.coords.accuracy + 'm');
          }
          
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
          const endTime = Date.now();
          const responseTime = endTime - startTime;
          
          let errorMessage = 'Unknown error occurred';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'User denied the request for Geolocation.';
              console.error('❌ PERMISSION_DENIED:', errorMessage);
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information is unavailable.';
              console.error('❌ POSITION_UNAVAILABLE:', errorMessage);
              break;
            case error.TIMEOUT:
              errorMessage = 'The request to get user location timed out.';
              console.error('❌ TIMEOUT:', errorMessage);
              break;
            default:
              console.error('❌ UNKNOWN ERROR:', error);
          }
          
          console.error('🚨 Geolocation FAILED:', {
            errorCode: error.code,
            errorMessage: errorMessage,
            responseTime: responseTime + 'ms'
          });
          
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
        observer.error('Geolocation is not supported by this browser.');
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
