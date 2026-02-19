import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EnvironmentService, ApiEnvironment } from '../../services/environment.service';

@Component({
  selector: 'app-environment-indicator',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="env-indicator" 
         [class.test]="currentEnv?.name === 'test'"
         [class.pilot]="currentEnv?.name === 'pilot'"
         [class.live]="currentEnv?.name === 'live'">
      {{ currentEnv?.displayName || 'Unknown' }}
    </div>
  `,
  styles: [`
    .env-indicator {
      position: fixed;
      border-radius: 4px;
      font-weight: 500;
      z-index: 1000;
      color: #333;
      background: #f8f9fa;
      border: 1px solid #dee2e6;
    }

    /* Desktop and laptop specific styles for description */
    @media (min-width: 769px) {
      .env-indicator {
        font-size: 14px;
        padding: 5px 12px;
        top: 10px;
        right: 15px;
      }
    }

    /* Mobile Responsiveness */
    @media (max-width: 768px) {
      .env-indicator {
        font-size: 13px;
        padding: 4px 8px;
        top: 10px;
        right: 10px;
      }
    }

    @media (max-width: 480px) {
      .env-indicator {
        font-size: 12px;
        padding: 4px 8px;
        top: 7px;
        right: 10px;
      }
    }

    .env-indicator.test {
      color: #856404;
      background: #fff3cd;
      border-color: #ffeaa7;
    }

    .env-indicator.pilot {
      color: #0c5460;
      background: #d1ecf1;
      border-color: #bee5eb;
    }

    .env-indicator.live {
      color: #155724;
      background: #d4edda;
      border-color: #c3e6cb;
    }
  `]
})
export class EnvironmentIndicatorComponent implements OnInit {
  currentEnv: ApiEnvironment | null = null;

  constructor(private environmentService: EnvironmentService) {}

  ngOnInit() {
    this.environmentService.currentEnvironment$.subscribe(env => {
      this.currentEnv = env;
    });
  }
}