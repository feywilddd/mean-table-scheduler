import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ReservationService } from '../../services/reservation.service';
import { AuthService } from '../../services/auth.service';
import { ModifyBookingModalComponent } from '../modify-booking-modal/modify-booking-modal.component';

@Component({
  selector: 'app-bookings',
  standalone: true,
  imports: [CommonModule, FormsModule, ModifyBookingModalComponent],
  templateUrl: './bookings.component.html',
  styleUrls: ['./bookings.component.css']
})
export class BookingsComponent implements OnInit {
  // Injected services
  private reservationService = inject(ReservationService);
  private authService = inject(AuthService);
  private router = inject(Router);
  
  // Component state
  isLoading = true;
  hasError = false;
  errorMessage = '';
  
  // Modal state
  showModifyModal = false;
  selectedReservation: any = null;
  
  constructor() {}
  
  ngOnInit(): void {
    // Load reservations if user is authenticated
    if (this.authService.isAuthenticated()) {
      this.loadReservations();
      
      // Add a force refresh after a short delay to ensure data is current
      setTimeout(() => {
        this.loadReservations();
      }, 300);
    } else {
      this.isLoading = false;
    }
  }
  
  get isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }
  
  get upcomingReservations() {
    const now = new Date();
    
    // Make sure we're only fetching reservations for the current user
    const currentUser = this.authService.currentUser;
    
    if (!currentUser) {
      return [];
    }
    
    return this.reservationService.userReservations().filter(reservation =>
      // Filter by current user and upcoming dates
      reservation.reservation_user_id === currentUser.user_id &&
      this.getServiceDateTime(reservation) > now
    ).sort((a, b) => 
      this.getServiceDateTime(a).getTime() - 
      this.getServiceDateTime(b).getTime()
    );
  }
  
  get pastReservations() {
    const now = new Date();
    
    // Make sure we're only fetching reservations for the current user
    const currentUser = this.authService.currentUser;
    
    if (!currentUser) {
      return [];
    }
    
    return this.reservationService.userReservations().filter(reservation =>
      // Filter by current user and past dates
      reservation.reservation_user_id === currentUser.user_id &&
      this.getServiceDateTime(reservation) < now
    ).sort((a, b) => 
      this.getServiceDateTime(b).getTime() - 
      this.getServiceDateTime(a).getTime()
    );
  }
  
  // Helper method to get the full date/time from a service instance
  private getServiceDateTime(reservation: any): Date {
    if (!reservation.serviceInstance) {
      return new Date(0); // Return a very old date as fallback
    }
    
    // Create a new date object from the service date
    const date = new Date(reservation.serviceInstance.service_date);
    
    // If we have start time, parse and add it to the date
    if (reservation.serviceInstance.start_time) {
      const timeParts = reservation.serviceInstance.start_time.split(':');
      if (timeParts.length >= 2) {
        date.setHours(parseInt(timeParts[0], 10), parseInt(timeParts[1], 10));
      }
    }
    
    return date;
  }
  
  get hasUpcomingReservations(): boolean {
    return this.upcomingReservations.length > 0;
  }
  
  get hasPastReservations(): boolean {
    return this.pastReservations.length > 0;
  }
  
  // Format date for display
  formatDate(reservation: any): string {
    if (!reservation?.serviceInstance?.service_date) {
      return 'Date inconnue';
    }
    
    const date = new Date(reservation.serviceInstance.service_date);
    return date.toLocaleDateString('fr-FR', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }
  
  // Format time for display
  formatTime(reservation: any): string {
    if (!reservation?.serviceInstance?.start_time) {
      return 'Heure inconnue';
    }
    
    const timeParts = reservation.serviceInstance.start_time.split(':');
    if (timeParts.length < 2) {
      return 'Heure inconnue';
    }
    
    return `${timeParts[0]}:${timeParts[1]}`;
  }
  
  // Load user reservations
  loadReservations(): void {
    this.isLoading = true;
    this.hasError = false;
    this.errorMessage = '';
    
    this.reservationService.getUserReservations().subscribe({
      next: () => {
        this.isLoading = false;
      },
      error: (error) => {
        this.isLoading = false;
        this.hasError = true;
        this.errorMessage = error.message || 'Une erreur est survenue lors du chargement de vos réservations';
      }
    });
  }
  
  // Navigate to login page
  goToLogin(): void {
    this.router.navigate(['/login'], { queryParams: { returnUrl: '/bookings' } });
  }
  
  // Navigate to booking page
  goToBooking(): void {
    this.router.navigate(['/book']);
  }
  
  // Open modify modal for a reservation
  openModifyModal(reservation: any): void {
    this.selectedReservation = reservation;
    this.showModifyModal = true;
  }
  
  // Close modify modal
  closeModifyModal(): void {
    this.showModifyModal = false;
    this.selectedReservation = null;
  }
  
  // Handle successful modification
  onModificationSuccess(): void {
    this.closeModifyModal();
    this.loadReservations();
  }
  
  // Handle modification cancel
  onModificationCancel(): void {
    this.closeModifyModal();
  }
}