import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Get token from localStorage
  const token = localStorage.getItem('token');
  const router = inject(Router);
  const authService = inject(AuthService);
  
  // If token exists, add it to request headers
  let authReq = req;
  if (token) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }
  
  // Handle the request
  return next(authReq).pipe(
    catchError((error) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        // Check if this is from the profile update endpoint and has password error
        if (req.url.includes('/me/edit') && 
            error.error?.message === 'Current password is incorrect') {
          // For password validation failures, don't log out
          return throwError(() => error);
        } else {
          // For other 401 errors (expired/invalid token), log out
          authService.logout();
          router.navigate(['']);
        }
      }
      return throwError(() => error);
    })
  );
};