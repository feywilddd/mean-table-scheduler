import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ReservationService, Reservation } from '../../services/reservation.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-bookings',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './bookings.component.html',
  styleUrls: ['./bookings.component.css']
})
export class BookingsComponent implements OnInit {
  // Using signals for reactive state management
  private bookingsSignal = signal<any[]>([]);
  private loadingSignal = signal<boolean>(false);
  private emailSignal = signal<string>('');
  private passwordSignal = signal<string>('');
  private loginErrorSignal = signal<string>('');
  
  // Computed values
  public isAuthenticated = computed(() => this.authService.isAuthenticated());
  public bookings = computed(() => this.bookingsSignal());
  public isLoading = computed(() => this.loadingSignal());
  public hasBookings = computed(() => this.bookingsSignal().length > 0);
  public loginError = computed(() => this.loginErrorSignal());
  
  constructor(
    private reservationService: ReservationService,
    private authService: AuthService
  ) {}
  
  ngOnInit(): void {
    // Load bookings if already logged in
    if (this.isAuthenticated()) {
      this.loadBookings();
    }
  }
  
  // Getters and setters for form fields
  get email(): string {
    return this.emailSignal();
  }
  
  set email(value: string) {
    this.emailSignal.set(value);
  }
  
  get password(): string {
    return this.passwordSignal();
  }
  
  set password(value: string) {
    this.passwordSignal.set(value);
  }
  
  // Load user's bookings
  loadBookings(): void {
    this.loadingSignal.set(true);
    
    this.reservationService.getUserReservations().subscribe({
      next: (reservations) => {
        // Transform reservations data for display
        const formattedBookings = reservations.map(booking => ({
          id: booking.reservation_id,
          date: this.formatDate(booking.service?.start_time),
          time: this.formatTime(booking.service?.start_time),
          numberOfPeople: booking.seats_taken,
          restaurant: booking.table?.restaurant?.name || 'Restaurant',
          tableNumber: booking.table?.number || 'N/A'
        }));
        
        this.bookingsSignal.set(formattedBookings);
        this.loadingSignal.set(false);
      },
      error: (error) => {
        console.error('Error loading bookings:', error);
        this.loadingSignal.set(false);
      }
    });
  }
  
  // Format date from ISO string
  formatDate(dateStr?: Date | string): string {
    if (!dateStr) return 'Date indisponible';
    
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }
  
  // Format time from ISO string
  formatTime(dateStr?: Date | string): string {
    if (!dateStr) return 'Heure indisponible';
    
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  // Login user
  login(): void {
    if (!this.email || !this.password) {
      this.loginErrorSignal.set('Veuillez saisir votre email et mot de passe');
      return;
    }
    
    this.loadingSignal.set(true);
    this.loginErrorSignal.set('');
    
    this.authService.login(this.email, this.password).subscribe({
      next: () => {
        this.loadingSignal.set(false);
        this.emailSignal.set('');
        this.passwordSignal.set('');
        // Load bookings after successful login
        this.loadBookings();
      },
      error: (error) => {
        console.error('Login error:', error);
        this.loginErrorSignal.set(error.message || 'Email ou mot de passe incorrect');
        this.loadingSignal.set(false);
      }
    });
  }
  
  // Cancel booking
  cancelBooking(bookingId: string): void {
    if (confirm('Êtes-vous sûr de vouloir annuler cette réservation?')) {
      this.loadingSignal.set(true);
      
      this.reservationService.cancelReservation(bookingId).subscribe({
        next: () => {
          // Update bookings list by filtering out the cancelled one
          const currentBookings = this.bookingsSignal();
          this.bookingsSignal.set(currentBookings.filter(b => b.id !== bookingId));
          this.loadingSignal.set(false);
        },
        error: (error) => {
          console.error('Error cancelling booking:', error);
          this.loadingSignal.set(false);
          alert('Erreur lors de l\'annulation de la réservation. Veuillez réessayer.');
        }
      });
    }
  }
  
  // Logout
  logout(): void {
    this.authService.logout();
    this.bookingsSignal.set([]);
  }
}