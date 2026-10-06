import { Component, signal, inject, HostListener, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { FinanceStateService } from '../../../core/services/finance-state.service';
import { EgpPipe } from '../pipes/formatting.pipe';
import { FINANCE_SECTIONS } from '../../../features/finance/finance-sections';

interface NavItem { path: string; label: string; icon: string; children?: NavItem[]; }

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, EgpPipe],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss']
})
export class LayoutComponent implements OnInit {
  auth = inject(AuthService);
  state = inject(FinanceStateService);
  router = inject(Router);

  sidebarOpen = signal(window.innerWidth > 1024);
  mobileOpen = signal(false);
  financeExpanded = signal(true);
  inFinance = signal(this.router.url.startsWith('/finance'));

  navItems = computed<NavItem[]>(() => [
    { path: '/dashboard', label: 'لوحة التحكم', icon: '📊' },
    {
      path: '/finance', label: 'المالية', icon: '💼',
      children: FINANCE_SECTIONS
        .filter(s => !s.roles || this.auth.hasRole(...s.roles))
        .map(s => ({ path: `/finance/${s.path}`, label: s.label, icon: s.icon })),
    },
    { path: '/agriculture', label: 'الزراعة', icon: '🌾' },
  ]);

  ngOnInit() {
    this.state.refreshBalance();
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
      this.inFinance.set(this.router.url.startsWith('/finance'));
      if (this.inFinance()) this.financeExpanded.set(true);
    });
  }

  @HostListener('window:resize')
  onResize() {
    if (window.innerWidth > 1024) this.sidebarOpen.set(true);
  }

  toggleSidebar() { this.sidebarOpen.update(v => !v); }
  toggleMobile() { this.mobileOpen.update(v => !v); }
  closeMobile() { this.mobileOpen.set(false); }
  logout() { this.auth.logout(); }

  onGroupClick(item: NavItem) {
    if (!this.sidebarOpen() && !this.mobileOpen()) {
      this.router.navigate([item.path]);
      return;
    }
    this.financeExpanded.update(v => !v);
  }
}
