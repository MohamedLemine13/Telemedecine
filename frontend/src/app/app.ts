import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { KpiDashboard } from './components';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, KpiDashboard],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('TeleMedecine');
}
