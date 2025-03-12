import { Component, OnInit, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { LoginFormWrapperComponent } from '../login-modal-wrapper/login-modal-wrapper.component';
import { InscriptionFormWrapperComponent } from '../inscription-modal-wrapper/inscription-modal-wrapper.component';
import { BookingService } from '../../services/booking.service';
import { AuthService } from '../../services/auth.service';
import { RefreshService } from '../../services/refresh.service';

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
  @Input() serviceInstanceId: string = ''; // Changed from serviceId
  @Input() tableId: string = '';
  
  @Output() close = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();
  
  // Using services
  private bookingService = inject(BookingService);
  private authService = inject(AuthService);
  private refreshService = inject(RefreshService);
  
  // Modal state - using a tab approach instead of separate modals
  activeAuthTab: 'login' | 'inscription' = 'login';
  
  // Add states for error handling
  isLoading = false;
  errorMessage = '';
  
  constructor() {}
  
  ngOnInit(): void {
    // Set the booking in the service
    if (this.date && this.time && this.serviceInstanceId && this.tableId) {
      this.bookingService.setBookingSelection({
        date: this.date,
        time: this.time,
        serviceInstanceId: this.serviceInstanceId, // Changed from serviceId
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
    if (this.isLoading) return;
    
    this.isLoading = true;
    this.errorMessage = '';
    
    // First trigger the confirm event
    this.confirm.emit();
    
    // Then call the booking service
    this.bookingService.confirmBooking();
    
    // After calling the service method, set up a handler for the current message
    const checkForErrors = () => {
      const currentMessage = this.bookingService.currentMessage;
      
      if (currentMessage.type === 'error') {
        this.errorMessage = currentMessage.text;
        this.isLoading = false;
      } else if (currentMessage.type === 'success') {
        this.isLoading = false;
        
        // Trigger a calendar refresh
        this.refreshService.triggerCalendarRefresh();
      }
    };
    
    // Check for errors or success after a small delay
    setTimeout(checkForErrors, 100);
    
    // And check again after a longer delay in case the operation takes time
    setTimeout(checkForErrors, 1000);
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