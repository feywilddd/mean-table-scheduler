import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-bookings',
  imports: [CommonModule],
  templateUrl: './bookings.component.html',
  styleUrl: './bookings.component.css'
})

export class BookingsComponent {
  isLoggedIn: boolean = false;
  bookings: any[] = [];

  login() {
    // Implement login logic
    this.isLoggedIn = true;
  }

  cancelBooking(bookingId: number) {
    // Implement booking cancellation logic
    this.bookings = this.bookings.filter(booking => booking.id !== bookingId);
  }
}

