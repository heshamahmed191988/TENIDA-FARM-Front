import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ApiService } from '../services/api.service';

// export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
//   const auth = inject(AuthService);
//   const api = inject(ApiService);

//   const token = auth.getToken();
//   const authReq = token ? req.clone({
//     setHeaders: { Authorization: `Bearer ${token}` }
//   }) : req;

//   return next(authReq).pipe(
//     catchError((error: HttpErrorResponse) => {
//       if (error.status === 401 && auth.getRefreshToken()) {
//         return api.refreshToken(auth.getRefreshToken()!).pipe(
//           switchMap(res => {
//             localStorage.setItem('tenida_access_token', res.AccessToken);
//             const retryReq = req.clone({
//               setHeaders: { Authorization: `Bearer ${res.AccessToken}` }
//             });
//             return next(retryReq);
//           }),
//           catchError(() => {
//             auth.logout();
//             return throwError(() => error);
//           })
//         );
//       }
//       return throwError(() => error);
//     })
//   );
// };
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const api = inject(ApiService);

  // ✅ Skip login & refresh endpoints
  if (req.url.includes('/auth/login') || req.url.includes('/auth/refresh')) {
    return next(req);
  }

  const token = auth.getToken();

  const authReq = token ? req.clone({
    setHeaders: { Authorization: `Bearer ${token}` }
  }) : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      console.log('INTERCEPTOR ERROR:', error); // 👈 keep this

      if (error.status === 401 && auth.getRefreshToken()) {
        return api.refreshToken(auth.getRefreshToken()!).pipe(
          switchMap(res => {
            localStorage.setItem('tenida_access_token', res.AccessToken);
            const retryReq = req.clone({
              setHeaders: { Authorization: `Bearer ${res.AccessToken}` }
            });
            return next(retryReq);
          }),
          catchError(() => {
            auth.logout();
            return throwError(() => error);
          })
        );
      }

      return throwError(() => error);
    })
  );
};