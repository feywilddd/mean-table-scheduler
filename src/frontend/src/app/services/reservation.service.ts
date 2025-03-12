import { Injectable, signal, computed } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';

export interface Reservation {
  user_name: any;
  user_email: any;
  user_phone: any;
  service_instance_id: any;
  service_date: any;
  start_time: any;
  service_id: any;
  table_id: any;
  table_name: any;
  table_seats: any;
  user_id: any;
  reservation_id: string;
  reservation_user_id: string;
  reservation_table_id: string;
  reservation_service_instance_id: string; // Changed from reservation_service_id
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
  serviceInstance?: { // Changed from service
    service_instance_id: string;
    service_date: Date;
    start_time: string; // TIME type from DB
    end_time: string; // TIME type from DB
    template?: {
      service_template_id: string;
      name: string;
      is_repeating: boolean;
      repeating_days_bitmask: number;
    }
  };
}

export interface ServiceTemplate {
  service_template_id: string;
  name: string;
  start_time: string; // TIME type from DB
  end_time: string; // TIME type from DB
  is_repeating: boolean;
  repeating_days_bitmask: number;
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ServiceInstance {
  service_instance_id: string;
  service_template_id: string;
  service_date: Date;
  start_time: string; // TIME type from DB
  end_time: string; // TIME type from DB
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
  template?: ServiceTemplate;
}

export interface ServiceAvailability {
  serviceInstance: ServiceInstance;
  hasAvailability: boolean;
  availableTableCount: number;
  availableTables?: {
    tableId: string;
    number: number;
    seats: number;
    restaurantId: string;
    restaurantName: string | null;
  }[];
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
  private serviceTemplatesSignal = signal<ServiceTemplate[]>([]);
  private serviceInstancesSignal = signal<ServiceInstance[]>([]);
  
  // Computed values for reservations
  public hasReservations = computed(() => this.userReservationsSignal().length > 0);
  public upcomingReservations = computed(() => {
    const now = new Date();
    return this.userReservationsSignal().filter(reservation => {
      if (!reservation.serviceInstance) return false;
      
      const serviceDate = new Date(reservation.serviceInstance.service_date);
      const startTimeParts = reservation.serviceInstance.start_time.split(':');
      
      // Set the hours and minutes from start_time to the service date
      serviceDate.setHours(
        parseInt(startTimeParts[0], 10),
        parseInt(startTimeParts[1], 10)
      );
      
      return serviceDate > now;
    }).sort((a, b) => {
      if (!a.serviceInstance || !b.serviceInstance) return 0;
      
      const dateA = new Date(a.serviceInstance.service_date);
      const timePartsA = a.serviceInstance.start_time.split(':');
      dateA.setHours(parseInt(timePartsA[0], 10), parseInt(timePartsA[1], 10));
      
      const dateB = new Date(b.serviceInstance.service_date);
      const timePartsB = b.serviceInstance.start_time.split(':');
      dateB.setHours(parseInt(timePartsB[0], 10), parseInt(timePartsB[1], 10));
      
      return dateA.getTime() - dateB.getTime();
    });
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
  createReservation(tableId: string, serviceInstanceId: string, seatsTaken: number): Observable<Reservation> {
    return this.http.post<Reservation>(`${this.API_URL}/reservations`, {
      tableId,
      serviceInstanceId, // Changed from serviceId
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
  
  // Get all service templates
  getServiceTemplates(): Observable<ServiceTemplate[]> {
    return this.http.get<ServiceTemplate[]>(`${this.API_URL}/services/templates`, {
      headers: this.getHeaders()
    }).pipe(
      tap(templates => {
        this.serviceTemplatesSignal.set(templates);
      }),
      catchError(this.handleError)
    );
  }
  
  // Get service instances for a date range
  getServiceInstances(startDate?: Date, endDate?: Date, templateId?: string): Observable<ServiceInstance[]> {
    let params = new HttpParams();
    
    if (startDate) {
      params = params.set('startDate', startDate.toISOString().split('T')[0]);
    }
    
    if (endDate) {
      params = params.set('endDate', endDate.toISOString().split('T')[0]);
    }
    
    if (templateId) {
      params = params.set('templateId', templateId);
    }
    
    return this.http.get<ServiceInstance[]>(`${this.API_URL}/services/instances`, {
      headers: this.getHeaders(),
      params
    }).pipe(
      tap(instances => {
        this.serviceInstancesSignal.set(instances);
      }),
      catchError(this.handleError)
    );
  }
  
  // Get available dates for a specific month
  getAvailableDates(year: number, month: number): Observable<string[]> {
    return this.http.get<string[]>(
      `${this.API_URL}/services/available-dates/${year}/${month}`, 
      { headers: this.getHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }
  
  // Get service instances with availability info for a date range
  getAvailableServices(startDate: Date, endDate: Date, seats: number): Observable<ServiceAvailability[]> {
    let params = new HttpParams()
      .set('startDate', startDate.toISOString().split('T')[0])
      .set('endDate', endDate.toISOString().split('T')[0])
      .set('seats', seats.toString());
    
    return this.http.get<ServiceAvailability[]>(
      `${this.API_URL}/reservations/available-services`, 
      { headers: this.getHeaders(), params }
    ).pipe(
      catchError(this.handleError)
    );
  }
  
  // Get available tables for a service instance
  getAvailableTables(serviceInstanceId: string, seats: number, restaurantId?: string): Observable<Table[]> {
    let params = new HttpParams()
      .set('seats', seats.toString());
    
    if (restaurantId) {
      params = params.set('restaurantId', restaurantId);
    }
    
    return this.http.get<Table[]>(
      `${this.API_URL}/reservations/available-tables/${serviceInstanceId}`, 
      { headers: this.getHeaders(), params }
    ).pipe(
      catchError(this.handleError)
    );
  }
  
  // Check if a specific table is available for a service instance
  checkTableAvailability(tableId: string, serviceInstanceId: string): Observable<{ available: boolean }> {
    return this.http.get<{ available: boolean }>(
      `${this.API_URL}/reservations/check-availability/${tableId}/${serviceInstanceId}`,
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
    serviceInstanceId?: string; // Changed from serviceId
    startDate?: Date;
    endDate?: Date;
  }): Observable<Reservation[]> {
    let params = new HttpParams();
    
    if (filters) {
      if (filters.userId) params = params.set('userId', filters.userId);
      if (filters.tableId) params = params.set('tableId', filters.tableId);
      if (filters.restaurantId) params = params.set('restaurantId', filters.restaurantId);
      if (filters.serviceInstanceId) params = params.set('serviceInstanceId', filters.serviceInstanceId);
      if (filters.startDate) params = params.set('startDate', filters.startDate.toISOString().split('T')[0]);
      if (filters.endDate) params = params.set('endDate', filters.endDate.toISOString().split('T')[0]);
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
  formatTime(timeString: string): string {
    // Handle time-only strings (from TIME fields in DB)
    if (timeString.length <= 8) { // "HH:MM:SS" format
      const parts = timeString.split(':');
      return `${parts[0]}:${parts[1]}`;
    }
    
    // Handle date-time strings
    const date = new Date(timeString);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  userReservations() {
    return this.userReservationsSignal();
  }
  
  // Update a reservation (change number of people)
  updateReservation(reservationId: string, seatsTaken: number): Observable<any> {
    return this.http.put<any>(`${this.API_URL}/reservations/${reservationId}`, {
      seatsTaken
    }, { headers: this.getHeaders() }).pipe(
      tap((updatedReservation) => {
        // Update the reservation in our local state
        const currentReservations = this.userReservationsSignal();
        const updatedReservations = currentReservations.map(r => 
          r.reservation_id === reservationId 
            ? { ...r, seats_taken: seatsTaken } 
            : r
        );
        this.userReservationsSignal.set(updatedReservations);
      }),
      catchError(this.handleError)
    );
  }
  
  // Get all service instances without filtering
  getAllServiceInstances(): Observable<any[]> {
    const url = `${this.API_URL}/admin/service-instances`;
    
    return this.http.get<any[]>(url, { headers: this.getHeaders() }).pipe(
      catchError(error => {
        console.error('Error fetching all service instances:', error);
        return this.handleError(error);
      })
    );
  }
  
  // Get all tables
  getAllTables(): Observable<any[]> {
    const url = `${this.API_URL}/admin/tables`;
    
    return this.http.get<any[]>(url, { headers: this.getHeaders() }).pipe(
      catchError(error => {
        console.error('Error fetching all tables:', error);
        return this.handleError(error);
      })
    );
  }
  
  // Get all users (admin endpoint)
  getAllUsers(): Observable<any[]> {
    const url = `${this.API_URL}/admin/users`;
    
    return this.http.get<any[]>(url, { headers: this.getHeaders() }).pipe(
      catchError(error => {
        console.error('Error fetching all users:', error);
        return this.handleError(error);
      })
    );
  }
  
  // Update a reservation (admin endpoint)
  updateReservationAdmin(
    reservationId: string,
    serviceInstanceId: string,
    userId: string,
    tableId: string,
    seatsTaken: number,
    status: string
  ): Observable<any> {
    const url = `${this.API_URL}/admin/reservations/${reservationId}`;
    
    const body = {
      service_instance_id: serviceInstanceId,
      user_id: userId,
      table_id: tableId,
      seats_taken: seatsTaken,
      status: status
    };
    
    return this.http.put<any>(url, body, { headers: this.getHeaders() }).pipe(
      catchError(error => {
        console.error('Error updating reservation:', error);
        return this.handleError(error);
      })
    );
  }
  
  // Delete a reservation (admin endpoint)
  deleteReservation(reservationId: string): Observable<any> {
    const url = `${this.API_URL}/admin/reservations/${reservationId}`;
    
    return this.http.delete<any>(url, { headers: this.getHeaders() }).pipe(
      catchError(error => {
        console.error('Error deleting reservation:', error);
        return this.handleError(error);
      })
    );
  }

  adminCreateReservation(serviceInstanceId: string, userId: string, seatsTaken: number): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/admin/reservations`, {
      service_instance_id: serviceInstanceId,
      user_id: userId,
      seats_taken: seatsTaken
    }, { headers: this.getHeaders() }).pipe(
      catchError(this.handleError)
    );
  }

  // Add this method to your ReservationService
adminUpdateReservation(
  reservationId: string, 
  serviceInstanceId: string, 
  userId: string, 
  seatsTaken: number
): Observable<any> {
  return this.http.put<any>(`${this.API_URL}/admin/reservations/${reservationId}`, {
    service_instance_id: serviceInstanceId,
    user_id: userId,
    seats_taken: seatsTaken
  }, { headers: this.getHeaders() }).pipe(
    catchError(this.handleError)
  );
}
}