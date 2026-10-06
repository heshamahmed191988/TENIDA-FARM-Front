import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { LoginRequest, AuthResponse, JwtPayload } from '../models/models';

const TOKEN_KEY = 'tenida_access_token';
const REFRESH_KEY = 'tenida_refresh_token';

// .NET writes the role claim with its full URI; accept both forms.
const ROLE_CLAIMS = ['role', 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
const NAME_CLAIMS = ['unique_name', 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'];

function claim(payload: Record<string, unknown> | null, names: string[]): string {
  if (!payload) return '';
  for (const n of names) {
    const v = payload[n];
    if (Array.isArray(v)) return String(v[0] ?? '');
    if (v !== undefined && v !== null) return String(v);
  }
  return '';
}

const ROLE_LABEL: Record<string, string> = {
  Admin: 'مدير النظام', Accountant: 'محاسب', Shareholder: 'مساهم', FieldSupervisor: 'مشرف ميداني',
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = inject(ApiService);
  private router = inject(Router);

  private _token = signal<string | null>(localStorage.getItem(TOKEN_KEY));
  private _user = signal<JwtPayload | null>(this.decodeJwt(this._token() || ''));

  readonly user = this._user.asReadonly();
  readonly token = this._token.asReadonly();
  readonly userRole = computed(() => claim(this._user() as any, ROLE_CLAIMS));
  readonly userLogin = computed(() => claim(this._user() as any, NAME_CLAIMS));
  readonly userRoleLabel = computed(() => ROLE_LABEL[this.userRole()] ?? this.userRole());
  readonly userName = computed(() => this._user()?.FullName ?? '');
  readonly shareholderId = computed(() => this._user()?.ShareholderId || null);

  /** Can create/edit journal movements, salaries, contributions. */
  readonly canWriteFinance = computed(() => ['Admin', 'Accountant'].includes(this.userRole()));
  readonly isAdminUser = computed(() => this.userRole() === 'Admin');

  isLoggedIn(): boolean {
    return !!this._token() && !this.isTokenExpired();
  }

  login(req: LoginRequest) {
    return this.api.login(req).pipe(tap(res => this.storeAuth(res)));
  }

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    this._user.set(null);
    this._token.set(null);
    this.router.navigate(['/auth/login']);
  }

  getToken(): string | null { return localStorage.getItem(TOKEN_KEY); }
  getRefreshToken(): string | null { return localStorage.getItem(REFRESH_KEY); }

  isTokenExpired(): boolean {
    const user = this._user();
    return !user || Date.now() / 1000 > user.exp;
  }

  hasRole(...roles: string[]): boolean {
    return roles.some(r => r.toLowerCase() === this.userRole().toLowerCase());
  }

  isAdmin(): boolean { return this.hasRole('Admin'); }

  /** Called by the interceptor after a silent token refresh. */
  storeAuth(res: AuthResponse) {
    if (!res?.accessToken) throw new Error('Token missing');
    localStorage.setItem(TOKEN_KEY, res.accessToken);
    if (res.refreshToken) localStorage.setItem(REFRESH_KEY, res.refreshToken);
    this._token.set(res.accessToken);
    this._user.set(this.decodeJwt(res.accessToken));
  }

  initAuth() {
    const token = this.getToken();
    if (!token) return;
    this._token.set(token);
    this._user.set(this.decodeJwt(token));
  }

  private decodeJwt(token: string): JwtPayload | null {
    try {
      const base64Url = token.split('.')[1];
      if (!base64Url) return null;
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const json = decodeURIComponent(atob(base64).split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
      return JSON.parse(json);
    } catch {
      return null;
    }
  }
}
