import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface KpiCardData {
  title: string;
  value: string;
  changePercent: number;
  trendPeriod: string;
  iconColor: string;
  chartType: 'bar' | 'area' | 'line' | 'progress';
  chartData: number[];
}

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './kpi-card.html',
  styleUrl: './kpi-card.css',
})
export class KpiCard {
  title = input.required<string>();
  value = input.required<string>();
  changePercent = input<number>(0);
  trendPeriod = input<string>('in last 7 Days');
  iconColor = input<string>('#5B93FF');
  chartType = input<'bar' | 'area' | 'line' | 'progress'>('bar');
  chartData = input<number[]>([40, 60, 30, 70, 50, 80, 65]);

  isPositive = computed(() => this.changePercent() >= 0);

  formattedChange = computed(() => {
    const val = this.changePercent();
    return val >= 0 ? `+${val}%` : `${val}%`;
  });

  // Normalize chart data to 0–100 range for SVG rendering
  normalizedData = computed(() => {
    const data = this.chartData();
    const max = Math.max(...data);
    return data.map(d => (d / max) * 100);
  });

  // Generate SVG path for area/line charts
  chartPath = computed(() => {
    const data = this.normalizedData();
    const width = 120;
    const height = 40;
    const step = width / (data.length - 1);

    const points = data.map((val, i) => ({
      x: i * step,
      y: height - (val / 100) * height,
    }));

    // Build smooth curve
    let path = `M ${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx1 = prev.x + step * 0.4;
      const cpx2 = curr.x - step * 0.4;
      path += ` C ${cpx1},${prev.y} ${cpx2},${curr.y} ${curr.x},${curr.y}`;
    }

    return path;
  });

  areaPath = computed(() => {
    const data = this.normalizedData();
    const width = 120;
    const height = 40;
    const step = width / (data.length - 1);

    const points = data.map((val, i) => ({
      x: i * step,
      y: height - (val / 100) * height,
    }));

    let path = `M ${points[0].x},${height}`;
    path += ` L ${points[0].x},${points[0].y}`;

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx1 = prev.x + step * 0.4;
      const cpx2 = curr.x - step * 0.4;
      path += ` C ${cpx1},${prev.y} ${cpx2},${curr.y} ${curr.x},${curr.y}`;
    }

    path += ` L ${width},${height} Z`;
    return path;
  });
}
