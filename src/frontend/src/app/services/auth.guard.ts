import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  // Check if user is authenticated
  if (!authService.isAuthenticated()) {
    router.navigate([''], { queryParams: { returnUrl: state.url } });
    return false;
  }
  
  // Check if route has role requirements
  const requiredRole = route.data['role'] as string | string[];
  
  if (requiredRole && !authService.hasRole(requiredRole)) {
    router.navigate(['/unauthorized']);
    return false;
  }
  
  return true;
};