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

export interface GetTripDataDto {
  tripNum: string;
  env?: string;
}

export interface SendTripDataDto {
  odometer: number;
  type: string;
  chk1: boolean;
  chk2: boolean;
  chk3: boolean;
  chk4: boolean;
  chk5: boolean;
  tripNum: string;
  note: string;
  env?: string;
}

export interface ProcessTripDataDto {
  tripNum: string;
  env?: string;
}
