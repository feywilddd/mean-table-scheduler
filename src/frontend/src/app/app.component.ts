// You're trying to access CalendarComponent directly, but it needs to be a property
// and it should be accessed with a ViewChild decorator

import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { CalendarComponent } from './components/calendar/calendar.component';
import { BookingsComponent } from './components/bookings/bookings.component';
import { ReservationService } from './services/reservation.service';
import { AuthService } from './services/auth.service';
import { RefreshService } from './services/refresh.service';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  imports: [RouterOutlet, SidebarComponent, CommonModule, CalendarComponent, BookingsComponent]
})
export class AppComponent implements OnInit {
  // Add ViewChild to reference the CalendarComponent
  @ViewChild(CalendarComponent) calendarComponent: CalendarComponent | undefined;
  
  private authService = inject(AuthService);
  private reservationService = inject(ReservationService);
  private refreshService = inject(RefreshService);
  
  title = 'frontend';
  
  ngOnInit(): void {
    // Check if user is authenticated on app load
    if (this.authService.isAuthenticated()) {
      // Preload reservations data if authenticated
      this.loadUserReservations();
    }
   
    // Subscribe to login events
    this.authService.loginComplete$.subscribe(() => {
      // When login completes, load the reservations
      this.loadUserReservations();
    });
    
    this.refreshService.refreshCalendar$.subscribe(() => {
      this.refreshCalendar();
    });
  }
 
  private loadUserReservations(): void {
    this.reservationService.getUserReservations().subscribe({
      next: (reservations) => {
        console.log('Reservations loaded:', reservations.length);
      },
      error: (error) => {
        console.error('Error loading reservations:', error);
      }
    });
  }
  
  refreshCalendar(): void {
    // Use lowercase calendarComponent to match the property name
    if (this.calendarComponent) {
      this.calendarComponent.refreshCalendar();
    } else {
      console.log('Calendar component not available yet, waiting...');
      // Attempt to refresh after a slight delay to allow for component initialization
      setTimeout(() => {
        if (this.calendarComponent) {
          this.calendarComponent.refreshCalendar();
        } else {
          console.warn('Calendar component still not available after delay');
        }
      }, 300);
    }
  }
}