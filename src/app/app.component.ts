import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SessionInfoComponent } from './components/session-info/session-info.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SessionInfoComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'Truck Management System';
}
