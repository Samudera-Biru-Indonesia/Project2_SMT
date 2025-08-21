import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
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

export interface Plant {
  Plant: string;  // Plant code like "SGI053"
  Name: string;   // Plant name like "SGI YOGYAKARTA"
}

export interface GetPlantListResponse {
  plants?: Plant[];
  data?: Plant[];
  // API might return different structure, so we handle both
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private sendTripDataUrl = `${environment.api.baseUrl}${environment.api.endpoints.sendTripData}`;
  private getTripDataUrl = `${environment.api.baseUrl}${environment.api.endpoints.getTripData}`;
  private getPlantListUrl = `${environment.api.baseUrl}${environment.api.endpoints.getPlantList}`;

  constructor(private http: HttpClient) {}

  sendTripData(data: TripData): Observable<any> {
    const basicAuth = btoa(`${environment.api.basicAuth.username}:${environment.api.basicAuth.password}`);
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Basic ${basicAuth}`,
      'Company': 'SGI',
      'x-api-key': environment.api.apiKey
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
    console.log('🚀 Request data types:', {
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
    console.log('📡 Request Headers:', {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Basic ${basicAuth.substring(0, 20)}...`,
      'Company': 'SGI',
      'x-api-key': environment.api.apiKey ? `${environment.api.apiKey.substring(0, 10)}...` : 'Not set'
    });
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
      'Company': 'SGI',
      'x-api-key': environment.api.apiKey
    });

    const requestBody: GetTripDataRequest = {
      tripNum: tripNum
    };

    console.log('Get Trip Data Request:', requestBody);
    console.log('Request Headers:', {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Basic ${basicAuth}`,
      'Company': 'SGI',
      'x-api-key': environment.api.apiKey
    });
    console.log('API URL:', this.getTripDataUrl);

    return this.http.post<TripInfo>(this.getTripDataUrl, requestBody, { headers });
  }

  /**
   * Get list of plants
   */
  getPlantList(): Observable<any> {
    // Debug Basic Auth encoding
    console.log('🔐 Raw credentials:', {
      username: environment.api.basicAuth.username,
      password: environment.api.basicAuth.password.substring(0, 5) + '...' + environment.api.basicAuth.password.slice(-3)
    });
    
    const credentialsString = `${environment.api.basicAuth.username}:${environment.api.basicAuth.password}`;
    console.log('🔗 Credentials string (first 20 chars):', credentialsString.substring(0, 20) + '...');
    
    const basicAuth = btoa(credentialsString);
    console.log('🔑 Basic Auth encoded (first 30 chars):', basicAuth.substring(0, 30) + '...');
    console.log('🔑 Basic Auth length:', basicAuth.length);
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Basic ${basicAuth}`,
      'Company': 'SGI',
      'x-api-key': environment.api.apiKey
    });

    // POST request with empty body (as per requirement)
    const emptyBody = {};

    console.log('🌱 Get Plant List Request');
    console.log('🔗 API URL:', this.getPlantListUrl);
    console.log('📋 Full URL breakdown:', {
      baseUrl: environment.api.baseUrl,
      endpoint: environment.api.endpoints.getPlantList,
      fullUrl: this.getPlantListUrl
    });
    console.log('📡 Request Headers:', {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Basic ${basicAuth.substring(0, 20)}...`,
      'Company': 'SGI',
      'x-api-key': environment.api.apiKey ? `${environment.api.apiKey.substring(0, 10)}...` : 'Not set'
    });
    console.log('📦 Request Body:', emptyBody);

    return this.http.post<any>(this.getPlantListUrl, emptyBody, { headers });
  }
}