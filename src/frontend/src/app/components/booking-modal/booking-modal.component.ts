import { Component, OnInit, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoginFormWrapperComponent } from '../login-modal-wrapper/login-modal-wrapper.component';
import { InscriptionFormWrapperComponent } from '../inscription-modal-wrapper/inscription-modal-wrapper.component';
import { BookingService } from '../../services/booking.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-booking-modal',
  standalone: true,
  imports: [CommonModule, LoginFormWrapperComponent, InscriptionFormWrapperComponent],
  templateUrl: './booking-modal.component.html',
  styleUrls: ['./booking-modal.component.css']
})
export class BookingModalComponent implements OnInit {
  @Input() date: string = '';
  @Input() time: string = '';
  @Input() numberOfPeople: number = 0;
  @Input() serviceId: string = '';
  @Input() tableId: string = '';
  
  @Output() close = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();
  
  // Using services
  private bookingService = inject(BookingService);
  private authService = inject(AuthService);
  
  // Modal state - using a tab approach instead of separate modals
  activeAuthTab: 'login' | 'inscription' = 'login';
  
  constructor() {}
  
  ngOnInit(): void {
    // Set the booking in the service
    if (this.date && this.time && this.serviceId && this.tableId) {
      this.bookingService.setBookingSelection({
        date: this.date,
        time: this.time,
        serviceId: this.serviceId,
        numberOfPeople: this.numberOfPeople,
        tableId: this.tableId
      });
    }
  }
  
  get isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }
  
  get username(): string {
    return this.authService.currentUser?.name || 'Client';
  }
  
  closeModal(): void {
    this.close.emit();
  }
  
  confirmBooking(): void {
    this.confirm.emit();
    this.bookingService.confirmBooking();
  }
  
  // Switch to the login tab
  showLogin(): void {
    this.activeAuthTab = 'login';
  }
  
  // Switch to the inscription tab
  showRegister(): void {
    this.activeAuthTab = 'inscription';
  }
  
  // Handle login form close - not really needed with the tab approach
  // but kept for API compatibility
  handleLoginClose(): void {
    // In the tabbed UI, this doesn't do much, but we keep it for compatibility
  }
  
  // Handle inscription form close - not really needed with the tab approach
  // but kept for API compatibility
  handleInscriptionClose(): void {
    // In the tabbed UI, this doesn't do much, but we keep it for compatibility
  }
  
  // Switch to inscription tab (called from login form)
  switchToRegisterModal(): void {
    this.activeAuthTab = 'inscription';
  }
  
  // Switch to login tab (called from inscription form)
  switchToLoginModal(): void {
    this.activeAuthTab = 'login';
  }
}