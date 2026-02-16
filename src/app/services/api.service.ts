import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { EnvironmentService } from './environment.service';
import { TripData, TripInfo } from '@shared/dto/trip.dto';
import { Plant } from '@shared/dto/plant.dto';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  constructor(
    private http: HttpClient,
    private environmentService: EnvironmentService
  ) {}

  private getEnvName(): string {
    return this.environmentService.getCurrentEnvironment().name;
  }

  sendTripData(data: TripData): Observable<any> {
    const url = this.environmentService.getProxyUrl() + '/send-trip-data';

    const requestData = {
      odometer: Number(data.odometer) || 0,
      type: String(data.type || ''),
      chk1: Boolean(data.chk1),
      chk2: Boolean(data.chk2),
      chk3: Boolean(data.chk3),
      chk4: Boolean(data.chk4),
      chk5: Boolean(data.chk5),
      tripNum: String(data.tripNum || ''),
      note: String(data.note || ''),
      env: this.getEnvName()
    };

    console.log('Trip Data Request:', requestData);
    console.log('API URL:', url);

    return this.http.post(url, requestData);
  }

  getTripData(tripNum: string): Observable<TripInfo> {
    const url = this.environmentService.getProxyUrl() + '/get-trip-data';

    const requestBody = {
      tripNum,
      env: this.getEnvName()
    };

    console.log('Get Trip Data Request:', requestBody);
    console.log('API URL:', url);

    return this.http.post<TripInfo>(url, requestBody);
  }

  getPlantList(): Observable<any> {
    const url = this.environmentService.getProxyUrl() + '/get-plant-list';

    const requestBody = {
      env: this.getEnvName()
    };

    console.log('Get Plant List Request');
    console.log('API URL:', url);

    return this.http.post<any>(url, requestBody);
  }

  processTripData(tripNum: string): Observable<any> {
    const url = this.environmentService.getProxyUrl() + '/process-trip-data';

    const requestBody = {
      tripNum,
      env: this.getEnvName()
    };

    console.log('Process Trip Data Request:', requestBody);
    console.log('API URL:', url);

    return this.http.post<any>(url, requestBody)
      .pipe(
        tap(response => console.log('Process Trip Data Response:', response)),
        catchError(error => {
          console.error('Process Trip Data Error:', error);
          return throwError(() => error);
        })
      );
  }
}
