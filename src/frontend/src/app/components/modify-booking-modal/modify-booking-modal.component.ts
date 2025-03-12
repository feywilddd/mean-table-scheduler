import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReservationService } from '../../services/reservation.service';
import { BookingService } from '../../services/booking.service';
import { RefreshService } from '../../services/refresh.service';

@Component({
  selector: 'app-modify-booking-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './modify-booking-modal.component.html',
  styleUrls: ['./modify-booking-modal.component.css']
})
export class ModifyBookingModalComponent implements OnInit {
  @Input() reservation: any;
  @Output() close = new EventEmitter<void>();
  @Output() success = new EventEmitter<void>();

  private reservationService = inject(ReservationService);
  private bookingService = inject(BookingService);

  // Component state
  isLoading = true;
  isDeleting = false;
  errorMessage = '';
  successMessage = '';
  
  // Form state
  numberOfPeople = 2;
  maxPeople = 6; // Default max is 6 people
  peopleOptions: number[] = [];
  availableTables: any[] = [];
  
  // Deletion state
  showDeleteConfirmation = false;
  deletionErrorMessage = '';

  constructor(
    private refreshService: RefreshService
  ) {}

  ngOnInit(): void {
    if (this.reservation) {
      this.numberOfPeople = this.reservation.seats_taken;
      this.checkAvailability();
    }
  }

  get formattedDate(): string {
    if (!this.reservation?.serviceInstance?.service_date) return 'Date inconnue';
    
    const date = new Date(this.reservation.serviceInstance.service_date);
    return date.toLocaleDateString('fr-FR', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  get formattedTime(): string {
    if (!this.reservation?.serviceInstance?.start_time) return 'Heure inconnue';
    
    // Handle TIME format from database (HH:MM:SS)
    const timeParts = this.reservation.serviceInstance.start_time.split(':');
    if (timeParts.length >= 2) {
      return `${timeParts[0]}:${timeParts[1]}`;
    }
    return 'Heure inconnue';
  }

  // Check table availability and determine max party size options
  checkAvailability(): void {
    if (!this.reservation?.reservation_service_instance_id) {
      this.isLoading = false;
      this.peopleOptions = [1, 2, 3, 4, 5, 6]; // Default options
      return;
    }
    
    this.isLoading = true;
    
    // Get all available tables for this service instance
    this.reservationService.getAvailableTables(
      this.reservation.reservation_service_instance_id,
      1, // Request with minimum party size to get all available tables
      ''  // No specific restaurant ID needed for single restaurant app
    ).subscribe({
      next: (tables) => {
        this.availableTables = tables;
        
        // Find max capacity from available tables
        let maxCapacity = 0;
        if (tables.length > 0) {
          maxCapacity = Math.max(...tables.map(table => table.seats));
        }
        
        // Also consider current reservation's table which might not be in available tables
        if (this.reservation.table?.seats) {
          // Include current table in capacity calculation
          maxCapacity = Math.max(maxCapacity, this.reservation.table.seats);
        }
        
        // Cap at 6 people regardless of actual max capacity
        maxCapacity = Math.min(maxCapacity, 6);
        
        // Generate people options from 1 to maxCapacity
        this.peopleOptions = Array.from({ length: maxCapacity }, (_, i) => i + 1);
        
        // If current seats taken is higher than our max (due to table reassignment)
        // make sure we include it as an option
        if (this.numberOfPeople > maxCapacity) {
          this.peopleOptions.push(this.numberOfPeople);
        }
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error checking table availability:', error);
        // Fallback to standard options on error
        this.peopleOptions = [1, 2, 3, 4, 5, 6];
        this.isLoading = false;
      }
    });
  }

  // Close the modal
  closeModal(): void {
    this.close.emit();
  }

  // Update the reservation
  updateReservation(): void {
    if (this.isLoading) return;
    
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    
    this.reservationService.updateReservation(
      this.reservation.reservation_id,
      this.numberOfPeople
    ).subscribe({
      next: () => {
        this.successMessage = 'Réservation mise à jour avec succès!';
        this.isLoading = false;
        this.refreshService.triggerCalendarRefresh();
        
        // Notify parent of success
        setTimeout(() => {
          this.success.emit();
        }, 200);
      },
      error: (error) => {
        this.errorMessage = error.message || 'Une erreur est survenue lors de la mise à jour de la réservation';
        this.isLoading = false;
      }
    });
  }

  // Show delete confirmation
  showDeleteConfirm(): void {
    this.showDeleteConfirmation = true;
  }

  // Cancel deletion
  cancelDelete(): void {
    this.showDeleteConfirmation = false;
    this.deletionErrorMessage = '';
  }

  // Delete the reservation
  deleteReservation(): void {
    if (this.isDeleting) return;
    
    this.isDeleting = true;
    this.deletionErrorMessage = '';
    
    this.reservationService.cancelReservation(
      this.reservation.reservation_id
    ).subscribe({
      next: () => {
        // Manual refresh approach - load user reservations after cancellation
        this.reservationService.getUserReservations().subscribe({
          next: () => {
            console.log('Reservations refreshed after cancellation');
            this.isDeleting = false;
            this.refreshService.triggerCalendarRefresh();
            // Notify parent of success
            this.success.emit();
          },
          error: (err) => {
            console.error('Error refreshing reservations after cancellation:', err);
            this.isDeleting = false;
            // Still notify parent of success since the cancellation itself worked
            this.success.emit();
          }
        });
      },
      error: (error) => {
        this.deletionErrorMessage = error.message || 'Une erreur est survenue lors de l\'annulation de la réservation';
        this.isDeleting = false;
      }
    });
  }
}