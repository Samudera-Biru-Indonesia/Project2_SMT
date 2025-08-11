import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface TripData {
  odometer: number;
  type: string;
  chk1: boolean;
  chk2: boolean;
  chk3: boolean;
  chk4: boolean;
  chk5: boolean;
  tripNum: string;
  note: string;
}

export interface TripInfo {
  driver: string;
  codriver: string;
  truckPlate: string;
  routeID: string;
  plant: string;
  ETADate: string;
  truckDesc: string;
}

export interface GetTripDataRequest {
  tripNum: string;
}

export interface GetTripDataResponse {
  success: boolean;
  data: TripInfo;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private sendTripDataUrl = 'https://epictestapp.samator.com/KineticTest2/api/v2/efx/SGI/SMTTruckCheckApp/InsertStagingTable';
  private getTripDataUrl = `${environment.api.baseUrl}${environment.api.endpoints.getTripData}`;

  constructor(private http: HttpClient) {}

  sendTripData(data: TripData): Observable<any> {
    const basicAuth = btoa(`${environment.api.basicAuth.username}:${environment.api.basicAuth.password}`);
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Basic ${basicAuth}`,
      'Company': 'test',
      'X-API-Key': environment.api.apiKey
    });

    // Ensure data is properly formatted
    const requestData = {
      odometer: Number(data.odometer) || 0,
      type: String(data.type || ''),
      chk1: Boolean(data.chk1),
      chk2: Boolean(data.chk2),
      chk3: Boolean(data.chk3),
      chk4: Boolean(data.chk4),
      chk5: Boolean(data.chk5),
      tripNum: String(data.tripNum || ''),
      note: String(data.note || '')
    };

    console.log('🚀 Original data received:', data);
    console.log('🚀 Trip Data Request (formatted):', requestData);
    console.log('� Request data types:', {
      odometer: typeof requestData.odometer,
      type: typeof requestData.type,
      chk1: typeof requestData.chk1,
      chk2: typeof requestData.chk2,
      chk3: typeof requestData.chk3,
      chk4: typeof requestData.chk4,
      chk5: typeof requestData.chk5,
      tripNum: typeof requestData.tripNum,
      note: typeof requestData.note
    });
    console.log('�📡 Request Headers:', {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Basic ${basicAuth.substring(0, 20)}...`,
      'Company': 'test',
      'X-API-Key': environment.api.apiKey ? `${environment.api.apiKey.substring(0, 10)}...` : 'Not set'
    });
    console.log('🌐 API URL:', this.sendTripDataUrl);
    console.log('📤 Final JSON payload:', JSON.stringify(requestData, null, 2));

    return this.http.post(this.sendTripDataUrl, requestData, { headers });
  }

  /**
   * Get trip data by trip number
   */
  getTripData(tripNum: string): Observable<TripInfo> {
    const basicAuth = btoa(`${environment.api.basicAuth.username}:${environment.api.basicAuth.password}`);
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Basic ${basicAuth}`,
      'X-API-Key': environment.api.apiKey
    });

    const requestBody: GetTripDataRequest = {
      tripNum: tripNum
    };

    console.log('Get Trip Data Request:', requestBody);
    console.log('Request Headers:', {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Basic ${basicAuth}`,
      'X-API-Key': environment.api.apiKey
    });
    console.log('API URL:', this.getTripDataUrl);

    return this.http.post<TripInfo>(this.getTripDataUrl, requestBody, { headers });
  }
}
