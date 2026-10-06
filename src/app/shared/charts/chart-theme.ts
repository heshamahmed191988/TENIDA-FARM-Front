import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { fmtCompact, fmtMoney } from '../../core/utils/format';

Chart.register(...registerables);

/** Brand palette (matches styles.scss tokens). */
export const PALETTE = {
  income: '#4caf50',
  expense: '#e57373',
  balance: '#c8a84b',
  grid: 'rgba(255,255,255,.05)',
  tick: '#7d9c8a',
  legend: '#a5c8b0',
  series: ['#4caf50', '#c8a84b', '#42a5f5', '#ab47bc', '#ef5350', '#ffa726', '#26c6da', '#9ccc65', '#ec407a', '#78909c'],
};

const font = { family: 'Cairo', size: 11 };

const tooltip = {
  backgroundColor: 'rgba(9,20,38,.95)',
  borderColor: 'rgba(200,168,75,.3)',
  borderWidth: 1,
  titleColor: '#c8a84b',
  bodyColor: '#e8f5e9',
  padding: 10,
  titleFont: font,
  bodyFont: font,
  rtl: true,
  textDirection: 'rtl' as const,
};

/** Bar + line chart options with money axes. */
export function moneyChartOptions(opts: { secondaryAxis?: boolean; stacked?: boolean } = {}): ChartConfiguration['options'] {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { intersect: false, mode: 'index' },
    plugins: {
      legend: { rtl: true, labels: { color: PALETTE.legend, font, padding: 14, boxWidth: 12 } },
      tooltip: { ...tooltip, callbacks: { label: ctx => ` ${ctx.dataset.label}: ${fmtMoney(+ctx.parsed.y)}` } },
    },
    scales: {
      x: { stacked: opts.stacked, ticks: { color: PALETTE.tick, font }, grid: { color: PALETTE.grid } },
      y: { stacked: opts.stacked, ticks: { color: PALETTE.tick, font, callback: v => fmtCompact(+v) }, grid: { color: PALETTE.grid } },
      ...(opts.secondaryAxis ? {
        y1: { position: 'left' as const, ticks: { color: PALETTE.balance, font, callback: (v: any) => fmtCompact(+v) }, grid: { display: false } },
      } : {}),
    },
  };
}

export function doughnutOptions(): ChartConfiguration<'doughnut'>['options'] {
  return {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '64%',
    plugins: {
      legend: { position: 'right', rtl: true, labels: { color: PALETTE.legend, font: { ...font, size: 10 }, padding: 8, boxWidth: 10 } },
      tooltip: { ...tooltip, callbacks: { label: ctx => ` ${ctx.label}: ${fmtMoney(+ctx.parsed)}` } },
    },
  };
}

/** Destroys a previous chart instance and renders a new one on the canvas. */
export function renderChart(canvas: HTMLCanvasElement | undefined, previous: Chart | null, config: ChartConfiguration): Chart | null {
  previous?.destroy();
  if (!canvas) return null;
  return new Chart(canvas, config);
}
