import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-empty',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="empty-state">
      <div class="empty-icon">{{ icon }}</div>
      <h3>{{ title }}</h3>
      <p *ngIf="subtitle" class="text-muted">{{ subtitle }}</p>
      <ng-content></ng-content>
    </div>
  `,
  styles: [`
    .empty-state { text-align:center; padding:3rem 1.5rem; }
    .empty-icon  { font-size:3rem; margin-bottom:1rem; opacity:.6; }
    h3           { font-size:1.1rem; color:var(--text-secondary); margin-bottom:.5rem; }
  `]
})
export class EmptyComponent {
  @Input() icon = '📭';
  @Input() title = 'لا توجد بيانات';
  @Input() subtitle = '';
}
