import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { EnvironmentService } from './environment.service';

export interface TripData {
  odometer: number;
  type: string;
  chk1: boolean;
  chk2: boolean;
  tripNum: string;
  note: string;
}

export interface TripInfo {
  driver: string;
  codriver: string;
  truckPlate: string;
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
  Lat: number;
  Long: number;
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
  private endpoints = {
    sendTripData: '/InsertStagingTable',
    getTripData: '/GetTripData',
    getPlantList: '/GetListPlant',
    processTripData: '/ProcessTripTimeEntry',
    login: '/AuthenticateLogon'
  };

  constructor(
    private http: HttpClient,
    private environmentService: EnvironmentService
  ) {}

  sendTripData(data: TripData): Observable<any> {
    const currentEnv = this.environmentService.getCurrentEnvironment();
    const basicAuth = btoa(`${environment.api.basicAuth.username}:${environment.api.basicAuth.password}`);
    const url = currentEnv.baseUrl + this.endpoints.sendTripData;
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Basic ${basicAuth}`,
      'Company': 'SGI',
      'x-api-key': currentEnv.apiKey
    });

    // Ensure data is properly formatted
    const requestData = {
      odometer: Number(data.odometer) || 0,
      type: String(data.type || ''),
      chk1: Boolean(data.chk1),
      chk2: Boolean(data.chk2),
      tripNum: String(data.tripNum || ''),
      note: String(data.note || '')
    };

    console.log('🚀 Original data received:', data);
    console.log('🚀 Trip Data Request (formatted):', requestData);
    console.log('🚀 Using environment:', currentEnv.displayName);
    console.log('🚀 API URL:', url);
    console.log('🚀 Request data types:', {
      odometer: typeof requestData.odometer,
      type: typeof requestData.type,
      chk1: typeof requestData.chk1,
      chk2: typeof requestData.chk2,
      tripNum: typeof requestData.tripNum,
      note: typeof requestData.note
    });
    console.log('📡 Request Headers:', {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Basic ${basicAuth.substring(0, 20)}...`,
      'Company': 'SGI',
      'x-api-key': currentEnv.apiKey ? `${currentEnv.apiKey.substring(0, 10)}...` : 'Not set'
    });
    console.log('📤 Final JSON payload:', JSON.stringify(requestData, null, 2));

    return this.http.post(url, requestData, { headers });
  }

  /**
   * Get trip data by trip number
   */
  getTripData(tripNum: string): Observable<TripInfo> {
    const currentEnv = this.environmentService.getCurrentEnvironment();
    const basicAuth = btoa(`${environment.api.basicAuth.username}:${environment.api.basicAuth.password}`);
    const url = currentEnv.baseUrl + this.endpoints.getTripData;
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Basic ${basicAuth}`,
      'Company': 'SGI',
      'x-api-key': currentEnv.apiKey
    });

    const requestBody: GetTripDataRequest = {
      tripNum: tripNum
    };

    console.log('Get Trip Data Request:', requestBody);
    console.log('Using environment:', currentEnv.displayName);
    console.log('Request Headers:', {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Basic ${basicAuth}`,
      'Company': 'SGI',
      'x-api-key': currentEnv.apiKey
    });
    console.log('API URL:', url);

    return this.http.post<TripInfo>(url, requestBody, { headers });
  }

  /**
   * Get list of plants
   */
  getPlantList(): Observable<any> {
    const currentEnv = this.environmentService.getCurrentEnvironment();
    const url = currentEnv.baseUrl + this.endpoints.getPlantList;
    
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
      'x-api-key': currentEnv.apiKey
    });

    // POST request with empty body (as per requirement)
    const emptyBody = {};

    console.log('🌱 Get Plant List Request');
    console.log('🌍 Using environment:', currentEnv.displayName);
    console.log('🔗 API URL:', url);
    console.log('📋 Full URL breakdown:', {
      baseUrl: currentEnv.baseUrl,
      endpoint: this.endpoints.getPlantList,
      fullUrl: url
    });
    console.log('📡 Request Headers:', {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Basic ${basicAuth.substring(0, 20)}...`,
      'Company': 'SGI',
      'x-api-key': currentEnv.apiKey ? `${currentEnv.apiKey.substring(0, 10)}...` : 'Not set'
    });
    console.log('📦 Request Body:', emptyBody);

    return this.http.post<any>(url, emptyBody, { headers });
  }

  /**
   * Process trip data to Epicor after staging table insert
   */
  processTripData(tripNum: string): Observable<any> {
    const currentEnv = this.environmentService.getCurrentEnvironment();
    const basicAuth = btoa(`${environment.api.basicAuth.username}:${environment.api.basicAuth.password}`);
    const url = currentEnv.baseUrl + this.endpoints.processTripData;
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Basic ${basicAuth}`,
      'Company': 'SGI',
      'x-api-key': currentEnv.apiKey
    });

    const requestBody = {
      tripNum: tripNum
    };

    console.log('🔄 Process Trip Data Request:', requestBody);
    console.log('🌍 Using environment:', currentEnv.displayName);
    console.log('📡 Request Headers:', {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Basic ${basicAuth.substring(0, 20)}...`,
      'Company': 'SGI',
      'x-api-key': currentEnv.apiKey ? `${currentEnv.apiKey.substring(0, 10)}...` : 'Not set'
    });
    console.log('🔗 API URL:', url);

    return this.http.post<any>(url, requestBody, { headers })
      .pipe(
        tap(response => console.log('✅ Process Trip Data Response:', response)),
        catchError(error => {
          console.error('❌ Process Trip Data Error:', error);
          return throwError(() => error);
        })
      );
  }

  uploadPhotos(tripNum: string, odometerPhoto: string, cargoPhoto: string): Observable<any> {
    const url = 'http://localhost:3000/api/upload-photos';

    const body = {
      tripNum,
      odometerPhoto,
      cargoPhoto
    };

    console.log('📸 Uploading photos for trip:', tripNum);

    return this.http.post<any>(url, body);
  }
}