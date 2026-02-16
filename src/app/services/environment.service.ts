import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ApiEnvironment {
  name: string;
  displayName: string;
}

@Injectable({
  providedIn: 'root'
})
export class EnvironmentService {
  private readonly proxyUrl = 'http://localhost:3000/api';

  private environments: { [key: string]: ApiEnvironment } = {
    test: {
      name: 'test',
      displayName: 'Test',
    },
    pilot: {
      name: 'pilot',
      displayName: 'Pilot',
    },
    live: {
      name: 'live',
      displayName: 'Live',
    }
  };

  private currentEnvironmentSubject = new BehaviorSubject<ApiEnvironment>(this.environments['live']);
  public currentEnvironment$ = this.currentEnvironmentSubject.asObservable();

  constructor() {
    const savedEnv = localStorage.getItem('selectedEnvironment') || 'live';
    const env = this.environments[savedEnv] || this.environments['live'];
    this.currentEnvironmentSubject.next(env);
  }

  getProxyUrl(): string {
    return this.proxyUrl;
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
