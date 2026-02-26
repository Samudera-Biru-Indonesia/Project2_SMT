import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { EnvironmentService } from './environment.service';

export interface TripData {
  odometer: number;
  type: string;
  chk1: boolean;
  chk2: boolean;
  tripNum: string;
  note: string;
  tripDriver: string;
  jumlahMuatan?: number;
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

export interface GetAllTripDataRequest {
  nopol: string;
  company: string;
  plant: string;
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

export interface GetTotalFromTripNumberResponse {
  total: number;
  type: string;
}

export interface OutTruckCheck {
  Company: string;
  TripNum: string;
  Odometer: number;
}

export interface GetOutTruckCheckResponse {
  TruckCheckData: {
    Result: OutTruckCheck[];
  };
}

export interface Truck {
  truckID: string;
  truckPlate: string;
  truckDesc: string;
  plantList: string;
}

export interface GetTruckListResponse {
  TruckData: {
    Result: Truck[];
  };
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
    login: '/AuthenticateLogon',
    getAllTripData: '/GetAllTripData',
    GetTotalFromTripNumber: "/getTotalFromTripNumber",
    getTruckList: '/getTruckByAuthSite',
    getOutTruckCheck: '/getOutTruckCheck'
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
      note: String(data.note || ''),
      jumlahMuatan: Number(data.jumlahMuatan) || 0
    };

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

    return this.http.post<TripInfo>(url, requestBody, { headers });
  }

  getAllTripData(nopol: string): Observable<any> {
    const currentEnv = this.environmentService.getCurrentEnvironment();
    const basicAuth = btoa(`${environment.api.basicAuth.username}:${environment.api.basicAuth.password}`);
    const url = currentEnv.baseUrl + this.endpoints.getAllTripData;

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Basic ${basicAuth}`,
      'Company': 'SGI',
      'x-api-key': currentEnv.apiKey
    });

    const requestBody: GetAllTripDataRequest = {
      nopol: nopol,
      company: localStorage.getItem('currentCompany') || '',
      plant: localStorage.getItem('currentPlant') || ''
    };

    return this.http.post<any>(url, requestBody, { headers });
  }

  /**
   * Get list of plants
   */
  getPlantList(): Observable<any> {
    const currentEnv = this.environmentService.getCurrentEnvironment();
    const url = currentEnv.baseUrl + this.endpoints.getPlantList;

    const credentialsString = `${environment.api.basicAuth.username}:${environment.api.basicAuth.password}`;
    const basicAuth = btoa(credentialsString);

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Basic ${basicAuth}`,
      'Company': 'SGI',
      'x-api-key': currentEnv.apiKey
    });

    const emptyBody = {};

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

    return this.http.post<any>(url, requestBody, { headers })
      .pipe(
        catchError(error => throwError(() => error))
      );
  }

  getOutTruckCheck(): Observable<GetOutTruckCheckResponse> {
    const currentEnv = this.environmentService.getCurrentEnvironment();
    const basicAuth = btoa(`${environment.api.basicAuth.username}:${environment.api.basicAuth.password}`);
    const url = currentEnv.baseUrl + this.endpoints.getOutTruckCheck;

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Basic ${basicAuth}`,
      'Company': 'SGI',
      'x-api-key': currentEnv.apiKey
    });

    const body = {
      Company: localStorage.getItem('currentCompany') || '',
      Plant: localStorage.getItem('currentPlant') || ''
    };

    return this.http.post<GetOutTruckCheckResponse>(url, body, { headers });
  }

  getTruckList(type: string): Observable<GetTruckListResponse> {
    const currentEnv = this.environmentService.getCurrentEnvironment();
    const basicAuth = btoa(`${environment.api.basicAuth.username}:${environment.api.basicAuth.password}`);
    const url = currentEnv.baseUrl + this.endpoints.getTruckList;

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Basic ${basicAuth}`,
      'Company': 'SGI',
      'x-api-key': currentEnv.apiKey
    });

    const body = {
      Company: localStorage.getItem('currentCompany') || '',
      Plant: localStorage.getItem('currentPlant') || '',
      Type: type
    };

    return this.http.post<GetTruckListResponse>(url, body, { headers });
  }

  getTotalFromTripNumber(tripNumber: string): Observable<GetTotalFromTripNumberResponse> {
    const currentEnv = this.environmentService.getCurrentEnvironment();
    const basicAuth = btoa(`${environment.api.basicAuth.username}:${environment.api.basicAuth.password}`);
    const url = currentEnv.baseUrl + this.endpoints.GetTotalFromTripNumber;

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Basic ${basicAuth}`,
      'Company': 'SGI',
      'x-api-key': currentEnv.apiKey
    });

    return this.http.post<GetTotalFromTripNumberResponse>(url, { tripNumber }, { headers });
  }

  uploadPhotos(tripNum: string, odometerPhoto: string, cargoPhoto: string): Observable<any> {
    const url = `${environment.backendUrl}/api/upload-photos`;
    return this.http.post<any>(url, { tripNum, odometerPhoto, cargoPhoto });
  }

}
