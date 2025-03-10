import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, Subject, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import { ReservationService } from './reservation.service';

export interface User {
  user_id: string;
  name: string;
  email: string;
  user_role: string;
  created_at: Date;
}

export interface AuthResponse {
  user: User;
  token: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = 'http://localhost:3000/api/auth'; // Update with your API URL
  
  // Using signals for reactive state management
  private currentUserSignal = signal<User | null>(this.getStoredUser());
  
  // Computed values derived from signals
  public isAuthenticated = computed(() => !!this.currentUserSignal());
  public userRole = computed(() => this.currentUserSignal()?.user_role || null);
  private loginCompleted = new Subject<boolean>();
  loginComplete$ = this.loginCompleted.asObservable();
  
  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  // Expose current user as a getter
  get currentUser(): User | null {
    return this.currentUserSignal();
  }

  // Login user
  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/login`, { email, password })
      .pipe(
        tap(response => this.handleAuthentication(response)),
        catchError(this.handleError)
      );
  }

  // Register new user
  register(userData: { name: string; email: string; password: string; user_role?: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/register`, userData)
      .pipe(
        catchError(this.handleError)
      );
  }

  updateProfile(userData: any): Observable<any> {
    // Check if user is authenticated
    if (!this.isAuthenticated()) {
      return throwError(() => new Error('User not authenticated'));
    }
  
    // Get the auth token
    const token = localStorage.getItem('token');
    
    // Prepare headers with authentication token
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  
    // API endpoint
    const url = `${this.API_URL}/me/edit`;
    
    // Make the API call
    return this.http.put<any>(url, userData, { headers }).pipe(
      tap(updatedUser => {
        // Update the current user in the service
        this.currentUserSignal.set({
          ...this.currentUserSignal(),
          ...updatedUser
        });
        
        // If the email was changed, update the stored user info
        if (userData.email && userData.email !== this.currentUser?.email) {
          // Update stored user data
          const userInfo = JSON.parse(localStorage.getItem('user') || '{}');
          userInfo.email = updatedUser.email;
          localStorage.setItem('user', JSON.stringify(userInfo));
        }
        
        // If name was changed, update the stored user info
        if (userData.name && userData.name !== this.currentUser?.name) {
          // Update stored user data
          const userInfo = JSON.parse(localStorage.getItem('user') || '{}');
          userInfo.name = updatedUser.name;
          localStorage.setItem('user', JSON.stringify(userInfo));
        }
      }),
      catchError(error => {
        console.error('Error updating profile:', error);
        
        // Handle specific error cases
        if (error.status === 400) {
          return throwError(() => new Error(error.error.message || 'Invalid data provided'));
        }
        if (error.status === 401) {
          return throwError(() => new Error('Current password is incorrect'));
        }
        if (error.status === 403) {
          return throwError(() => new Error('Not authorized to update this profile'));
        }
        if (error.status === 409) {
          return throwError(() => new Error('Email is already in use'));
        }
        
        // Generic error
        return throwError(() => new Error('Failed to update profile. Please try again.'));
      })
    );
  }

  // Log out user
  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUserSignal.set(null);
    this.router.navigate(['/login']);
  }

  // Get current user info from server
  refreshUserInfo(): Observable<User> {
    return this.http.get<User>(`${this.API_URL}/me`)
      .pipe(
        tap(user => {
          this.currentUserSignal.set(user);
          localStorage.setItem('user', JSON.stringify(user));
        }),
        catchError(this.handleError)
      );
  }

  // Check if token is valid
  validateToken(): Observable<{ valid: boolean; user: User }> {
    const token = localStorage.getItem('token');
    if (!token) {
      return throwError(() => new Error('No token found'));
    }

    return this.http.post<{ valid: boolean; user: User }>(`${this.API_URL}/validate-token`, { token })
      .pipe(
        tap(response => {
          if (response.valid) {
            this.currentUserSignal.set(response.user);
            localStorage.setItem('user', JSON.stringify(response.user));
          } else {
            this.logout();
          }
        }),
        catchError(error => {
          this.logout();
          return throwError(() => error);
        })
      );
  }

  // Check if user has specific role
  hasRole(role: string | string[]): boolean {
    const currentUser = this.currentUserSignal();
    if (!currentUser) return false;

    if (Array.isArray(role)) {
      return role.includes(currentUser.user_role);
    }
    
    return currentUser.user_role === role;
  }

  // Check if token is expired
  private isTokenExpired(token: string): boolean {
    try {
      const decoded: any = jwtDecode(token);
      return decoded.exp < Date.now() / 1000;
    } catch (error) {
      return true;
    }
  }

  // Private helper methods
  private handleAuthentication(authResponse: AuthResponse): void {
    localStorage.setItem('token', authResponse.token);
    localStorage.setItem('user', JSON.stringify(authResponse.user));
    this.currentUserSignal.set(authResponse.user);
    this.loginCompleted.next(true);
  }

  private getStoredUser(): User | null {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if (!token || !user || this.isTokenExpired(token)) {
      return null;
    }

    return JSON.parse(user);
  }

  private handleError(error: any): Observable<never> {
    let errorMessage = 'An unknown error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else if (error.status) {
      // Server-side error
      errorMessage = `${error.error?.message || error.message}`;
    }
    
    return throwError(() => new Error(errorMessage));
  }

  getCurrentUser(): Observable<any> {
    // If user is already loaded in the service, you could return it directly
    if (this.currentUser) {
      return of(this.currentUser);
    }
    
    // Otherwise, fetch from API
    const url = `${this.API_URL}/users/me`;
    
    return this.http.get<any>(url).pipe(
      tap(user => {
        // Update the currentUser in your service
        this.currentUserSignal.set(user);
      }),
      catchError(error => {
        console.error('Error fetching current user', error);
        return throwError(() => new Error('Failed to load user profile'));
      })
    );
  }

  private loadReservationsAfterLogin(): void {
    const reservationService = inject(ReservationService);
    
    // Load user reservations in the background
    if (this.isAuthenticated()) {
      reservationService.getUserReservations().subscribe({
        next: (reservations) => {
          console.log('Reservations loaded after login:', reservations.length);
        },
        error: (error) => {
          console.error('Error loading reservations after login:', error);
        }
      });
    }
  }
  
  // Removed duplicate updateProfile method
}