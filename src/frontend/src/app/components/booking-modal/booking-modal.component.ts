// Updated BookingModalComponent with improved refresh handling

import { Component, OnInit, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, of, timer } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
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
  @Input() serviceInstanceId: string = ''; 
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
        serviceInstanceId: this.serviceInstanceId,
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
    
    // Enhanced error checking with multiple retries and mandatory refresh
    this.checkBookingStatus(1); // Try up to 5 times
  }
  
  // New method for more reliable booking status checking and refresh
  private checkBookingStatus(maxRetries: number, currentRetry = 0): void {
    const checkForStatusAndRefresh = () => {
      const currentMessage = this.bookingService.currentMessage;
      
      if (currentMessage.type === 'error') {
        this.errorMessage = currentMessage.text;
        this.isLoading = false;
        console.log('Booking error:', this.errorMessage);
      } else if (currentMessage.type === 'success') {
        console.log('Booking successful - triggering calendar refresh');
        this.isLoading = false;
        
        // IMPORTANT: Always trigger refresh for both updates and creations
        this.refreshService.triggerCalendarRefresh();
        
        // Close modal after success if needed
       this.closeModal(); 
      } else if (currentRetry < maxRetries) {
        // No definitive status yet, retry after delay
        console.log(`No definitive booking status yet, retry ${currentRetry + 1}/${maxRetries}`);
        setTimeout(() => this.checkBookingStatus(maxRetries, currentRetry + 1), 500);
      } else {
        // Max retries reached, still no definitive status
        console.log('Max retries reached without definitive booking status');
        this.isLoading = false;
        
        // Force refresh anyway to be safe
        this.refreshService.triggerCalendarRefresh();
      }
    };
    
    // Initial check after a short delay
    setTimeout(checkForStatusAndRefresh, 300);
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