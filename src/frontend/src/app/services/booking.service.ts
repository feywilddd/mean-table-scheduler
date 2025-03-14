import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ReservationService } from './reservation.service';
import { AuthService } from './auth.service';

export interface BookingSelection {
  date: string;
  time: string;
  serviceInstanceId: string; // Changed from serviceId
  numberOfPeople: number;
  tableId: string;
}

@Injectable({
  providedIn: 'root'
})
export class BookingService {
  // Using signals for reactive state management
  private bookingSelectionSignal = signal<BookingSelection | null>(null);
  private loadingSignal = signal<boolean>(false);
  private messageSignal = signal<{ type: 'success' | 'error' | ''; text: string }>({ type: '', text: '' });
  private pendingBookingKey = 'pendingBooking';
  
  // Add this property for tracking booked services
  private bookedServiceInstancesSignal = signal<Set<string>>(new Set<string>());
 
  // Computed values
  public hasSelection = computed(() => !!this.bookingSelectionSignal());
  public isLoading = computed(() => this.loadingSignal());
 
  constructor(
    private reservationService: ReservationService,
    private authService: AuthService,
    private router: Router
  ) {
    // Try to restore pending booking on service initialization
    this.restorePendingBooking();
    
    // Load user's reservations to check for existing bookings
    this.loadUserReservations();
  }
  
  // Add this method to load user's reservations
  private loadUserReservations(): void {
    if (this.authService.isAuthenticated()) {
      this.reservationService.getUserReservations().subscribe({
        next: (reservations) => {
          // Create a set of service instance IDs that the user has already booked
          const bookedServiceInstances = new Set<string>();
          
          reservations.forEach(reservation => {
            if (reservation.reservation_service_instance_id) {
              bookedServiceInstances.add(reservation.reservation_service_instance_id);
            }
          });
          
          this.bookedServiceInstancesSignal.set(bookedServiceInstances);
        },
        error: (error) => {
          console.error('Error loading user reservations:', error);
        }
      });
    }
  }
  
 
  // Set current booking selection
  setBookingSelection(booking: BookingSelection): void {
    this.bookingSelectionSignal.set(booking);
  }
 
  // Clear current booking selection
  clearBookingSelection(): void {
    this.bookingSelectionSignal.set(null);
    this.clearMessage();
  }
 
  // Get current booking selection
  get currentSelection(): BookingSelection | null {
    return this.bookingSelectionSignal();
  }
 
  // Get current message
  get currentMessage(): { type: 'success' | 'error' | ''; text: string } {
    return this.messageSignal();
  }
 
  // Set message
  setMessage(type: 'success' | 'error' | '', text: string): void {
    this.messageSignal.set({ type, text });
  }
 
  // Clear message
  clearMessage(): void {
    this.messageSignal.set({ type: '', text: '' });
  }
 
  // Set loading state
  setLoading(isLoading: boolean): void {
    this.loadingSignal.set(isLoading);
  }
 
  // Confirm booking
  confirmBooking(): void {
    const booking = this.bookingSelectionSignal();
   
    if (!booking) {
      this.setMessage('error', 'Aucune réservation sélectionnée');
      return;
    }
   
    // Check if user is logged in
    if (!this.authService.isAuthenticated()) {
      // Save booking selection and redirect to login
      localStorage.setItem(this.pendingBookingKey, JSON.stringify(booking));
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/book/confirm' } });
      return;
    }
   
    this.setLoading(true);
    
    // Create reservation
    this.reservationService.createReservation(
      booking.tableId,
      booking.serviceInstanceId, // Changed from serviceId
      booking.numberOfPeople
    ).subscribe({
      next: (reservation) => {
        this.setMessage('success', 'Réservation confirmée avec succès!');
        this.clearBookingSelection();
        this.setLoading(false);
        
        // Add the service instance ID to the booked services set
        const bookedServiceInstances = this.bookedServiceInstancesSignal();
        bookedServiceInstances.add(booking.serviceInstanceId);
        this.bookedServiceInstancesSignal.set(bookedServiceInstances);
        
        // Redirect to bookings page after a delay
        setTimeout(() => {
          this.router.navigate(['/dashboard']);
          this.clearMessage();
        }, 200);
      },
      error: (error) => {
        console.error('Error confirming booking:', error);
        this.setMessage('error', `Erreur: ${error.message}`);
        this.setLoading(false);
      }
    });
  }
 
  // Restore pending booking after login
  restorePendingBooking(): BookingSelection | null {
    const pendingBooking = localStorage.getItem(this.pendingBookingKey);
   
    if (pendingBooking) {
      try {
        const booking = JSON.parse(pendingBooking) as BookingSelection;
        this.setBookingSelection(booking);
        localStorage.removeItem(this.pendingBookingKey);
        return booking;
      } catch (error) {
        localStorage.removeItem(this.pendingBookingKey);
      }
    }
   
    return null;
  }

  /**
   * Check if a service instance is already booked by the current user
   */
  isServiceInstanceAlreadyBooked(serviceInstanceId: string): boolean {
    if (!serviceInstanceId) {
      return false;
    }
    
    const bookedServiceInstances = this.bookedServiceInstancesSignal();
    return bookedServiceInstances.has(serviceInstanceId);
  }

  /**
   * Force refresh of booked services from the API
   */
  refreshBookedServices(): void {
    this.loadUserReservations();
  }

  /**
   * Get all booked service instances (for debugging or UI needs)
   */
  getBookedServiceInstances(): string[] {
    return Array.from(this.bookedServiceInstancesSignal());
  }
}