import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ApiEnvironment {
  name: string;
  displayName: string;
  baseUrl: string;
  apiKey: string;
}

@Injectable({
  providedIn: 'root'
})
export class EnvironmentService {
  private environments: { [key: string]: ApiEnvironment } = {
    test: {
      name: 'test',
      displayName: 'Test',
      baseUrl: 'https://epictestapp.samator.com/KineticTest2/api/v2/efx/SGI/SMTTruckCheckApp',
      apiKey: 'W5hczOaOGdc68PcfchvZSvhUmWOf9AX3P6Zhfm0cghdPu'
    },
    pilot: {
      name: 'pilot',
      displayName: 'Pilot',
      baseUrl: 'https://epicprodapp.samator.com/KineticPilot/api/v2/efx/SGI/SMTTruckCheckApp',
      apiKey: 'W5hczOaOGdc68PcfchvZSvhUmWOf9AX3P6Zhfm0cghdPu'
    },
    live: {
      name: 'live',
      displayName: 'Live',
      baseUrl: 'https://epicprodapp.samator.com/Kinetic/api/v2/efx/SGI/SMTTruckCheckApp',
      apiKey: 'W5hczOaOGdc68PcfchvZSvhUmWOf9AX3P6Zhfm0cghdPu'
    }
  };

  private currentEnvironmentSubject = new BehaviorSubject<ApiEnvironment>(this.environments['live']);
  public currentEnvironment$ = this.currentEnvironmentSubject.asObservable();

  constructor() {
    // Always start with LIVE environment (ignore localStorage on fresh login)
    // This ensures every login session starts with LIVE
    this.currentEnvironmentSubject.next(this.environments['live']);
    localStorage.setItem('selectedEnvironment', 'live');
  }

  setEnvironment(envName: string): void {
    if (this.environments[envName]) {
      this.currentEnvironmentSubject.next(this.environments[envName]);
      localStorage.setItem('selectedEnvironment', envName);
    }
  }

  getCurrentEnvironment(): ApiEnvironment {
    return this.currentEnvironmentSubject.value;
  }

  getEnvironments(): ApiEnvironment[] {
    return Object.values(this.environments);
  }
}