import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendarComponent } from '../calendar/calendar.component';
import { BookingsComponent } from '../bookings/bookings.component';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, CalendarComponent,BookingsComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {

}
