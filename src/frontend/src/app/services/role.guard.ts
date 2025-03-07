// src/app/guards/role.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
  
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}
  
  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    // Get required roles from route data
    const requiredRoles = route.data['roles'] as Array<string>;
    
    // Check if the user has any of the required roles
    if (requiredRoles && requiredRoles.length > 0) {
      const hasRequiredRole = requiredRoles.some(role => 
        this.authService.hasRole(role)
      );
      
      if (!hasRequiredRole) {
        // Redirect to dashboard if user doesn't have required role
        this.router.navigate(['/dashboard']);
        return false;
      }
    }
    
    return true;
  }
}