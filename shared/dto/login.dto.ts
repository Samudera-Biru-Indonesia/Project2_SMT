export interface LoginRequestDto {
  logonSite: string;
  logonEMP: string;
  curLatitude: number;
  curLongitude: number;
  env?: string;
}
