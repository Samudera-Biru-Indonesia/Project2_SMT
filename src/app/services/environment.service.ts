import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';

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
    local: {
      name: 'local',
      displayName: 'Local (Dummy)',
      baseUrl: '/api/dummy',
      apiKey: 'dummy-key'
    },
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
    const saved = localStorage.getItem('selectedEnvironment');
    const initial = (saved && this.environments[saved]) ? this.environments[saved] : this.environments['live'];
    this.currentEnvironmentSubject.next(initial);
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