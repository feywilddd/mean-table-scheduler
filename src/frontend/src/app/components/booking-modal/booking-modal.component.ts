import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BookingService } from '../../services/booking.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-booking-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './booking-modal.component.html',
  styleUrls: ['./booking-modal.component.css']
})
export class BookingModalComponent {
  @Input() date: string = '';
  @Input() time: string = '';
  @Input() serviceInstanceId: string = ''; // Changed from serviceId
  @Input() numberOfPeople: number = 2;
  @Input() tableId: string = '';
  @Input() table: any = null;
  
  @Output() close = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();
  
  private bookingService = inject(BookingService);
  private authService = inject(AuthService);
  
  constructor() {}
  
  onClose(): void {
    this.close.emit();
  }
  
  onConfirm(): void {
    // Save the booking selection
    this.bookingService.setBookingSelection({
      date: this.date,
      time: this.time,
      serviceInstanceId: this.serviceInstanceId, // Changed from serviceId
      numberOfPeople: this.numberOfPeople,
      tableId: this.tableId
    });
    
    // Emit confirm event
    this.confirm.emit();
    
    // Call the booking service to confirm
    this.bookingService.confirmBooking();
  }
  
  get isAlreadyBooked(): boolean {
    if (typeof this.serviceInstanceId !== 'string' || !this.serviceInstanceId) {
      return false;
    }
    
    return this.bookingService.isServiceInstanceAlreadyBooked(this.serviceInstanceId);
  }
}