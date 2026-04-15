import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-spinner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="loading-wrap" [class.inline]="inline">
      <div class="spinner" [class.spinner-sm]="size === 'sm'"></div>
      <p *ngIf="message && !inline" class="text-muted">{{ message }}</p>
    </div>
  `,
  styles: [`
    .loading-wrap { display:flex; align-items:center; justify-content:center; min-height:180px; flex-direction:column; gap:1rem; }
    .loading-wrap.inline { min-height:unset; flex-direction:row; gap:.5rem; }
  `]
})
export class SpinnerComponent {
  @Input() message = 'جاري التحميل...';
  @Input() size: 'sm' | 'md' = 'md';
  @Input() inline = false;
}
