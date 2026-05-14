import { Component, input } from '@angular/core';
import { KpiCard, KpiCardData } from '../kpi-card/kpi-card';

@Component({
  selector: 'app-kpi-dashboard',
  standalone: true,
  imports: [KpiCard],
  templateUrl: './kpi-dashboard.html',
  styleUrl: './kpi-dashboard.css',
})
export class KpiDashboard {
  /**
   * KPI data can be passed via input for API integration.
   * If no data is provided, static defaults are used.
   */
  kpiData = input<KpiCardData[]>([
    {
      title: 'Doctors',
      value: '0',
      changePercent: 95,
      trendPeriod: 'in last 7 Days',
      iconColor: '#5B93FF',
      chartType: 'progress',
      chartData: [30, 55, 40, 70, 45, 80, 65],
    },
    {
      title: 'Patients',
      value: '4,178',
      changePercent: 25,
      trendPeriod: 'in last 7 Days',
      iconColor: '#FFB547',
      chartType: 'area',
      chartData: [20, 35, 50, 40, 65, 55, 70],
    },
    {
      title: 'Appointments',
      value: '12,178',
      changePercent: 0,
      trendPeriod: 'in last 7 Days',
      iconColor: '#00B074',
      chartType: 'bar',
      chartData: [50, 35, 60, 45, 75, 55, 200],
    },
    {
      title: 'Revenue',
      value: '2 MRU',
      changePercent: 25,
      trendPeriod: 'in last 7 Days',
      iconColor: '#00B074',
      chartType: 'line',
      chartData: [30, 25, 45, 35, 50, 40, 65],
    },
    {
      title: 'Prescriptions',
      value: '3,842',
      changePercent: 12,
      trendPeriod: 'in last 7 Days',
      iconColor: '#8B5CF6',
      chartType: 'area',
      chartData: [25, 40, 35, 55, 45, 60, 72],
    },
  ]);
}
