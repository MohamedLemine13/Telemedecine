import { Component, computed, input } from '@angular/core';

export interface KpiCardData {
  title: string;
  value: string;
  changePercent: number;
  trendPeriod: string;
  iconColor: string;
  chartType: 'bar' | 'area' | 'line' | 'progress';
  chartData: number[];
}

/**
 * KPI card with an inline SVG sparkline. The chart variants — bar, area, line,
 * progress — come from the existing implementation (commit 4b8e4ac). What's
 * changed during the migration to `shared/ui/`:
 *
 *   • Colours are now design-token-driven (callers pass either an `iconColor`
 *     literal or a `var(--…)` reference).
 *   • Default badges resolve to `--color-success` / `--color-error` instead of
 *     baked-in hex.
 */
@Component({
  selector: 'app-kpi-card',
  standalone: true,
  templateUrl: './kpi-card.html',
  styleUrl: './kpi-card.css'
})
export class KpiCard {
  readonly title = input.required<string>();
  readonly value = input.required<string>();
  readonly changePercent = input<number>(0);
  readonly trendPeriod = input<string>('in last 7 Days');
  /** Hex literal or a CSS `var(--…)` reference. */
  readonly iconColor = input<string>('var(--color-info)');
  readonly chartType = input<'bar' | 'area' | 'line' | 'progress'>('bar');
  readonly chartData = input<number[]>([40, 60, 30, 70, 50, 80, 65]);

  readonly isPositive = computed(() => this.changePercent() >= 0);

  readonly formattedChange = computed(() => {
    const val = this.changePercent();
    return val >= 0 ? `+${val}%` : `${val}%`;
  });

  /** Normalise to 0–100 for SVG rendering. */
  readonly normalizedData = computed(() => {
    const data = this.chartData();
    const max = Math.max(...data);
    return data.map(d => (d / max) * 100);
  });

  /** Smooth curve through the data points. */
  readonly chartPath = computed(() => {
    const data = this.normalizedData();
    const width = 120;
    const height = 36;
    const step = width / (data.length - 1);
    const points = data.map((val, i) => ({ x: i * step, y: height - (val / 100) * height }));
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

  readonly areaPath = computed(() => {
    const data = this.normalizedData();
    const width = 120;
    const height = 36;
    const step = width / (data.length - 1);
    const points = data.map((val, i) => ({ x: i * step, y: height - (val / 100) * height }));
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
