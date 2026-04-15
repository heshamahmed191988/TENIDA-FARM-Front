import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { LoginRequest, AuthResponse, JwtPayload } from '../models/models';

const TOKEN_KEY = 'tenida_access_token';
const REFRESH_KEY = 'tenida_refresh_token';
const USER_KEY = 'tenida_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = inject(ApiService);
  private router = inject(Router);

  // ── Signals ─────────────────────────────────────────────────────
 private _user = signal<JwtPayload | null>(this.decodeJwt(this.getToken() || ''));
private _token = signal<string | null>(this.getToken());

  readonly user = this._user.asReadonly();
  readonly token = this._token.asReadonly();
  readonly isLoggedIn = computed(() => !!this._token() && !this.isTokenExpired());
  readonly userRole = computed(() => this._user()?.role ?? '');
  readonly userName = computed(() => this._user()?.FullName ?? '');
  readonly shareholderId = computed(() => this._user()?.ShareholderId ?? null);

  login(req: LoginRequest) {
  return this.api.login(req).pipe(
    tap(res => {
      this.storeAuth(res);
    })
  );
}

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    this._user.set(null);
    this._token.set(null);
    this.router.navigate(['/auth/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  }

  isTokenExpired(): boolean {
    const user = this._user();
    if (!user) return true;
    return Date.now() / 1000 > user.exp;
  }

  hasRole(role: string): boolean {
    return this.userRole().toLowerCase() === role.toLowerCase();
  }

  isAdmin(): boolean { return this.hasRole('Admin'); }
  isAccountant(): boolean { return this.hasRole('Accountant'); }
  isShareholder(): boolean { return this.hasRole('Shareholder'); }

  // private storeAuth(res: AuthResponse) {
  //   localStorage.setItem(TOKEN_KEY, res.AccessToken);
  //   localStorage.setItem(REFRESH_KEY, res.RefreshToken);
  //   const payload = this.decodeJwt(res.AccessToken);
  //   if (payload) {
  //     localStorage.setItem(USER_KEY, JSON.stringify(payload));
  //     this._user.set(payload);
  //     this._token.set(res.AccessToken);
  //   }
  // }
private storeAuth(res: any) {
  const token = res?.AccessToken;

  if (!token) throw new Error('Token missing');

  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(REFRESH_KEY, res.RefreshToken);

  this._token.set(token);
  this._user.set(this.decodeJwt(token)); // ✅ always fresh decode
}
  private loadUser(): JwtPayload | null {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  }



 private decodeJwt(token: string): JwtPayload | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;

    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('JWT decode failed', e);
    return null;
  }
}
initAuth() {
  const token = this.getToken();
  if (!token) return;

  this._token.set(token);
  this._user.set(this.decodeJwt(token));
}
}
