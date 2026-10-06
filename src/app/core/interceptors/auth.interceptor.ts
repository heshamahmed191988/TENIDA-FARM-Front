import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ApiService } from '../services/api.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const api = inject(ApiService);

  // Login & refresh go out without a bearer token
  if (req.url.includes('/auth/login') || req.url.includes('/auth/refresh')) {
    return next(req);
  }

  const token = auth.getToken();
  const authReq = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      const refresh = auth.getRefreshToken();
      if (error.status === 401 && refresh) {
        return api.refreshToken(refresh).pipe(
          switchMap(res => {
            auth.storeAuth(res);
            return next(req.clone({ setHeaders: { Authorization: `Bearer ${res.accessToken}` } }));
          }),
          catchError(() => {
            auth.logout();
            return throwError(() => error);
          })
        );
      }
      if (error.status === 401) auth.logout();
      return throwError(() => error);
    })
  );
};
