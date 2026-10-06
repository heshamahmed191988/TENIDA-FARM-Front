import { Component, OnInit, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { FinanceStateService } from '../../core/services/finance-state.service';
import { EgpPipe } from '../../shared/components/pipes/formatting.pipe';
import { FINANCE_SECTIONS } from './finance-sections';

/** Finance hub: header + section tabs; every finance page renders in the outlet. */
@Component({
  selector: 'app-finance-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, EgpPipe],
  template: `
    <div class="finance-shell animate-fade">
      <div class="fs-header">
        <div class="fs-title">
          <span class="fs-icon">💼</span>
          <div>
            <h2>الإدارة المالية</h2>
            <p>الخزينة العامة لمزرعة تنيدة — جميع المبالغ بالجنيه المصري</p>
          </div>
        </div>
        <div class="fs-balance" [class.neg]="(state.balance() ?? 0) < 0">
          <span class="lbl">رصيد الخزينة الحالي</span>
          <span class="val">{{ state.balance() === null ? '...' : (state.balance() | egp) }}</span>
        </div>
      </div>

      <nav class="tabs-nav mb-3" aria-label="أقسام المالية">
        <a *ngFor="let s of sections()" [routerLink]="s.path" routerLinkActive="active" [title]="s.hint">
          <span>{{ s.icon }}</span>{{ s.label }}
        </a>
      </nav>

      <router-outlet />
    </div>
  `,
  styles: [`
    .fs-header { display:flex; align-items:center; justify-content:space-between; gap:1rem; flex-wrap:wrap; margin-bottom:1rem; }
    .fs-title { display:flex; align-items:center; gap:.85rem; }
    .fs-icon { font-size:2rem; width:56px; height:56px; border-radius:16px; display:flex; align-items:center; justify-content:center;
      background:linear-gradient(135deg,rgba(26,92,46,.6),rgba(200,168,75,.25)); border:1px solid var(--border); }
    h2 { font-size:1.4rem; color:var(--secondary); }
    p { font-size:.82rem; color:var(--text-secondary); }
    .fs-balance { display:flex; flex-direction:column; align-items:flex-end; padding:.65rem 1.1rem; border-radius:12px;
      background:rgba(76,175,80,.08); border:1px solid rgba(76,175,80,.3); }
    .fs-balance .lbl { font-size:.72rem; color:var(--text-muted); }
    .fs-balance .val { font-size:1.25rem; font-weight:800; color:#81c784; font-variant-numeric:tabular-nums; }
    .fs-balance.neg { background:rgba(244,67,54,.08); border-color:rgba(244,67,54,.3); }
    .fs-balance.neg .val { color:#ef9a9a; }
  `]
})
export class FinanceShellComponent implements OnInit {
  state = inject(FinanceStateService);
  private auth = inject(AuthService);

  sections = computed(() => FINANCE_SECTIONS.filter(s => !s.roles || this.auth.hasRole(...s.roles)));

  ngOnInit() {
    this.state.refreshBalance();
    this.state.loadLookups().subscribe();
  }
}
