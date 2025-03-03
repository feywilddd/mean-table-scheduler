import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';

// Make interface compatible with your existing User type
export interface UserResponse {
  user_id: string;
  name: string;
  email: string;
  user_role: string;
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class UsersService {
  private readonly API_URL = 'http://localhost:3000/api/users'; // Update with your API URL

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  // Get all users (admin only)
  getUsers(): Observable<UserResponse[]> {
    return this.http.get<UserResponse[]>(this.API_URL)
      .pipe(
        catchError(this.handleError)
      );
  }

  // Get a single user by ID
  getUserById(userId: string): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${this.API_URL}/${userId}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  // Create a new user (admin only)
  createUser(userData: {
    name: string;
    email: string;
    password: string;
    user_role: string;
  }): Observable<UserResponse> {
    return this.http.post<UserResponse>(this.API_URL, userData)
      .pipe(
        catchError(this.handleError)
      );
  }

  // Update a user (admin only or own profile)
  updateUser(userId: string, userData: {
    name?: string;
    email?: string;
    password?: string;
    user_role?: string;
  }): Observable<UserResponse> {
    return this.http.put<UserResponse>(`${this.API_URL}/${userId}`, userData)
      .pipe(
        catchError(this.handleError)
      );
  }

  // Soft delete a user (admin only)
  deleteUser(userId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.API_URL}/${userId}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  // Restore a soft-deleted user (admin only)
  restoreUser(userId: string): Observable<UserResponse> {
    return this.http.put<UserResponse>(`${this.API_URL}/${userId}/restore`, {})
      .pipe(
        catchError(this.handleError)
      );
  }

  // Error handler - compatible with your existing pattern
  private handleError(error: any): Observable<never> {
    let errorMessage = 'An unknown error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else if (error.status) {
      // Server-side error with status code
      errorMessage = error.error?.message || error.message || 'Server error';
    }
    
    console.error('Users service error:', error);
    return throwError(() => new Error(errorMessage));
  }
}