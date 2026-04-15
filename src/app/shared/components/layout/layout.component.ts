import { Component, signal, inject, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ApiService } from '../../../core/services/api.service';
import { Router } from '@angular/router';

interface NavItem { path: string; label: string; icon: string; }

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss']
})
export class LayoutComponent implements OnInit {
  auth       = inject(AuthService);
  private api = inject(ApiService);
  router     = inject(Router);

  sidebarOpen  = signal(window.innerWidth > 1024);
  mobileOpen   = signal(false);
  liveBalance  = signal<number | null>(null);

  navItems: NavItem[] = [
    { path: '/dashboard',      label: 'لوحة التحكم',    icon: '📊' },
    { path: '/finance',        label: 'المالية',         icon: '💰' },
    { path: '/shareholders',   label: 'المساهمون',       icon: '👥' },
    { path: '/agriculture',    label: 'الزراعة',         icon: '🌾' },
    { path: '/infrastructure', label: 'البنية التحتية',  icon: '🏗️' },
    { path: '/operations',     label: 'العمليات',        icon: '⚙️' },
    { path: '/reports',        label: 'التقارير',        icon: '📋' },
  ];

  ngOnInit() {
    // Load live balance for header
    this.api.getCurrentBalance().subscribe({
      next: r => this.liveBalance.set(r.CurrentBalanceSar),
      error: () => this.liveBalance.set(690381)  // fallback to Excel value
    });
  }

  @HostListener('window:resize')
  onResize() {
    if (window.innerWidth > 1024) this.sidebarOpen.set(true);
  }

  toggleSidebar() { this.sidebarOpen.update(v => !v); }
  toggleMobile()  { this.mobileOpen.update(v => !v); }
  closeMobile()   { this.mobileOpen.set(false); }
  logout()        { this.auth.logout(); }

  formatBalance(n: number | null): string {
    if (n === null) return '...';
    return n.toLocaleString('ar-SA', { minimumFractionDigits: 0 });
  }
}
