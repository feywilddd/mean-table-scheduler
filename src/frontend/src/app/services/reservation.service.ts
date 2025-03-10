import { Injectable, signal, computed } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';

export interface Reservation {
  reservation_id: string;
  reservation_user_id: string;
  reservation_table_id: string;
  reservation_service_id: string;
  seats_taken: number;
  created_at: Date;
  updated_at: Date;
  table?: {
    table_id: string;
    number: number;
    seats: number;
    restaurant?: {
      restaurant_id: string;
      name: string;
      address: string;
      phone: string;
    };
  };
  service?: {
    service_id: string;
    start_time: Date;
    end_time: Date;
    is_repeting: boolean;
    repeating_days_bitmask: number;
  };
}

export interface Service {
  service_id: string;
  start_time: Date;
  end_time: Date;
  is_repeting: boolean;
  repeating_days_bitmask: number;
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Table {
  table_id: string;
  table_restaurant_id: string;
  number: number;
  seats: number;
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
  restaurant?: {
    restaurant_id: string;
    name: string;
    address: string;
    phone: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ReservationService {
  private readonly API_URL = 'http://localhost:3000/api';
  
  // Using signals for reactive state management
  private userReservationsSignal = signal<Reservation[]>([]);
  private servicesSignal = signal<Service[]>([]);
  
  // Computed values for reservations
  public hasReservations = computed(() => this.userReservationsSignal().length > 0);
  public upcomingReservations = computed(() => {
    const now = new Date();
    return this.userReservationsSignal().filter(reservation => 
      new Date(reservation.service?.start_time || '') > now
    ).sort((a, b) => 
      new Date(a.service?.start_time || '').getTime() - 
      new Date(b.service?.start_time || '').getTime()
    );
  });
  
  constructor(private http: HttpClient) {}
  
  // Get auth headers
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    console.log('Using auth token:', token ? 'Token exists' : 'No token found');
    
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }
  
  // Error handling
  private handleError(error: any): Observable<never> {
    let errorMessage = 'An unknown error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else if (error.status) {
      // Server-side error
      switch (error.status) {
        case 400:
          errorMessage = error.error?.message || 'Invalid reservation data';
          break;
        case 401:
          errorMessage = 'Authentication required. Please log in again.';
          break;
        case 403:
          errorMessage = 'You do not have permission to perform this action.';
          break;
        case 404:
          errorMessage = 'Reservation not found.';
          break;
        case 409:
          errorMessage = error.error?.message || 'Reservation conflict.';
          break;
        default:
          errorMessage = error.error?.message || error.message || errorMessage;
      }
    }
    
    return throwError(() => new Error(errorMessage));
  }

  // Get current user's reservations
  getUserReservations(): Observable<Reservation[]> {
    return this.http.get<Reservation[]>(`${this.API_URL}/reservations/my-reservations`, { 
      headers: this.getHeaders() 
    }).pipe(
      tap(reservations => {
        this.userReservationsSignal.set(reservations);
      }),
      catchError(this.handleError)
    );
  }
  
  // Get a single reservation by ID
  getReservationById(reservationId: string): Observable<Reservation> {
    return this.http.get<Reservation>(`${this.API_URL}/reservations/${reservationId}`, { 
      headers: this.getHeaders() 
    }).pipe(
      catchError(this.handleError)
    );
  }
  
  // Create a new reservation
  createReservation(tableId: string, serviceId: string, seatsTaken: number): Observable<Reservation> {
    return this.http.post<Reservation>(`${this.API_URL}/reservations`, {
      tableId,
      serviceId,
      seatsTaken
    }, { headers: this.getHeaders() }).pipe(
      tap(reservation => {
        // Update the reservations signal with the new reservation
        const currentReservations = this.userReservationsSignal();
        this.userReservationsSignal.set([...currentReservations, reservation]);
      }),
      catchError(this.handleError)
    );
  }
  
  // Cancel a reservation
  cancelReservation(reservationId: string): Observable<any> {
    return this.http.delete<any>(`${this.API_URL}/reservations/${reservationId}`, { 
      headers: this.getHeaders() 
    }).pipe(
      tap(() => {
        // Remove the cancelled reservation from the signal
        const currentReservations = this.userReservationsSignal();
        this.userReservationsSignal.set(
          currentReservations.filter(r => r.reservation_id !== reservationId)
        );
      }),
      catchError(this.handleError)
    );
  }
  
  // Get all services (optionally filtered by date range)
  getServices(startDate?: Date, endDate?: Date): Observable<Service[]> {
    let params = new HttpParams();
    
    if (startDate) {
      params = params.set('startDate', startDate.toISOString());
    }
    
    if (endDate) {
      params = params.set('endDate', endDate.toISOString());
    }
    
    return this.http.get<Service[]>(`${this.API_URL}/services`, {
      headers: this.getHeaders(),
      params
    }).pipe(
      tap(services => {
        this.servicesSignal.set(services);
      }),
      catchError(this.handleError)
    );
  }
  
  // Get all services without any date filtering
  getAllServices(): Observable<Service[]> {
    console.log('Requesting all services from API');
    
    // Check if we have authentication
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('No authentication token found - services may require authentication');
    }
    
    return this.http.get<Service[]>(`${this.API_URL}/services/`, {
      headers: this.getHeaders()
    }).pipe(
      tap(services => {
        console.log('Services loaded successfully:', services.length);
        this.servicesSignal.set(services);
      }),
      catchError(error => {
        console.error('Error loading services:', error);
        
        // If unauthorized, return empty array instead of error to prevent app crashes
        if (error.status === 401) {
          console.warn('Unauthorized access to services - are you logged in?');
          return []; 
        }
        
        return throwError(() => new Error('Failed to load services'));
      })
    );
  }
  
  // Get available tables for a service
  getAvailableTables(serviceId: string, seats: number, restaurantId?: string): Observable<Table[]> {
    let params = new HttpParams()
      .set('seats', seats.toString());
    
    if (restaurantId) {
      params = params.set('restaurantId', restaurantId);
    }
    
    return this.http.get<Table[]>(
      `${this.API_URL}/reservations/available-tables/${serviceId}`, 
      { headers: this.getHeaders(), params }
    ).pipe(
      catchError(this.handleError)
    );
  }
  
  // Check if a specific table is available for a service
  checkTableAvailability(tableId: string, serviceId: string): Observable<{ available: boolean }> {
    return this.http.get<{ available: boolean }>(
      `${this.API_URL}/reservations/check-availability/${tableId}/${serviceId}`,
      { headers: this.getHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  getTable(tableId: string): Observable<Table> {
    return this.http.get<Table>(`${this.API_URL}/tables/${tableId}`, { 
      headers: this.getHeaders() 
    }).pipe(
      catchError(this.handleError)
    );
  }
  
  // Get all reservations (admin only, with filtering options)
  getAllReservations(filters?: {
    userId?: string;
    tableId?: string;
    restaurantId?: string;
    serviceId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Observable<Reservation[]> {
    let params = new HttpParams();
    
    if (filters) {
      if (filters.userId) params = params.set('userId', filters.userId);
      if (filters.tableId) params = params.set('tableId', filters.tableId);
      if (filters.restaurantId) params = params.set('restaurantId', filters.restaurantId);
      if (filters.serviceId) params = params.set('serviceId', filters.serviceId);
      if (filters.startDate) params = params.set('startDate', filters.startDate.toISOString());
      if (filters.endDate) params = params.set('endDate', filters.endDate.toISOString());
    }
    
    return this.http.get<Reservation[]>(`${this.API_URL}/reservations`, {
      headers: this.getHeaders(),
      params
    }).pipe(
      catchError(this.handleError)
    );
  }
  
  // Helper methods for the calendar component
  // Convert ISO date to display format
  formatDate(date: Date): string {
    const day = date.getDate();
    const month = date.toLocaleString('fr-FR', { month: 'short' }).slice(0, 3);
    return `${day} ${month}`;
  }

  // Get day name in French
  getDayName(date: Date): string {
    const dayNames = ['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM'];
    return dayNames[date.getDay()];
  }

  // Format time for display
  formatTime(timeString: string | Date): string {
    const date = typeof timeString === 'string' ? new Date(timeString) : timeString;
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
}