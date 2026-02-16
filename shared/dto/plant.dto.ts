export interface Plant {
  Plant: string;
  Name: string;
}

export interface GetPlantListResponse {
  plants?: Plant[];
  data?: Plant[];
}

export interface GetPlantListDto {
  env?: string;
}
