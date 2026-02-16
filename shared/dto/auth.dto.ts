import { UserLocation } from './location.dto';

export interface AuthUser {
  username: string;
  empCode: string;
  site: string;
  role: string;
  loginTime: Date;
  lastActivityTime: Date;
  sessionExpiryTime: Date;
  location?: UserLocation;
  apiResponse?: any;
}

export interface LoginResponse {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}
