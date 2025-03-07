// src/app/services/table.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';

// Table interface - matches your backend model
export interface Table {
  table_id: string;
  table_restaurant_id: string;
  number: number;
  seats: number;
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  restaurant_name?: string; // Included when joined with restaurant
}

// Restaurant interface
export interface Restaurant {
  restaurant_id: string;
  name: string;
  address: string;
  phone: string;
  created_at: string;
  updated_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class TableService {
  private readonly API_URL = 'http://localhost:3000/api/tables'; // Update with your API URL
  private readonly RESTAURANTS_API_URL = 'http://localhost:3000/api/restaurants'; // Update with your API URL

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  // Get all tables (admin only)
  getAllTables(): Observable<Table[]> {
    return this.http.get<Table[]>(this.API_URL)
      .pipe(
        catchError(this.handleError)
      );
  }

  // Get tables for a specific restaurant
  getTablesByRestaurant(restaurantId: string): Observable<Table[]> {
    return this.http.get<Table[]>(`${this.API_URL}/restaurant/${restaurantId}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  // Get a single table by ID
  getTableById(tableId: string): Observable<Table> {
    return this.http.get<Table>(`${this.API_URL}/${tableId}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  // Create a new table (admin only)
  createTable(tableData: {
    table_restaurant_id: string;
    number: number;
    seats: number;
  }): Observable<Table> {
    return this.http.post<Table>(this.API_URL, tableData)
      .pipe(
        catchError(this.handleError)
      );
  }

  // Update a table (admin only)
  updateTable(tableId: string, tableData: {
    table_restaurant_id: string;
    number: number;
    seats: number;
  }): Observable<Table> {
    return this.http.put<Table>(`${this.API_URL}/${tableId}`, tableData)
      .pipe(
        catchError(this.handleError)
      );
  }

  // Soft delete a table (admin only)
  deleteTable(tableId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.API_URL}/${tableId}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  // Restore a soft-deleted table (admin only)
  restoreTable(tableId: string): Observable<Table> {
    return this.http.post<Table>(`${this.API_URL}/${tableId}/restore`, {})
      .pipe(
        catchError(this.handleError)
      );
  }

  // Get all deleted tables
  getDeletedTables(): Observable<Table[]> {
    return this.http.get<Table[]>(`${this.API_URL}/deleted/all`)
      .pipe(
        catchError(this.handleError)
      );
  }

  // Get all restaurants (for table management dropdowns)
  getAllRestaurants(): Observable<Restaurant[]> {
    return this.http.get<Restaurant[]>(this.RESTAURANTS_API_URL)
      .pipe(
        catchError(this.handleError)
      );
  }

  // Error handler - compatible with your existing pattern
  private handleError(error: any): Observable<never> {
    let errorMessage: string;
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else if (error.error && error.error.message) {
      // Server returned an error message
      errorMessage = error.error.message;
    } else if (error.status) {
      // Server-side error with status code but no message
      switch (error.status) {
        case 400:
          errorMessage = 'Requête invalide';
          break;
        // [other status codes]
        default:
          errorMessage = `Erreur (${error.status})`;
      }
    } else {
      errorMessage = 'Une erreur inconnue est survenue';
    }
    
    console.error('Table service error:', error);
    return throwError(() => new Error(errorMessage));
  }
}