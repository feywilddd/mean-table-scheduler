import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendarSpotComponent } from '../calendar-spot/calendar-spot.component';

interface Day {
  name: string;
  date: string;
  spots: string[];
}

@Component({
  selector: 'app-calendar',
  imports: [CalendarSpotComponent, CommonModule],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.css'
})

export class CalendarComponent {
  numberOfPeople: number = 2;
  selectedDate: string | null = null;
  selectedTime: string | null = null;
  @Output() bookingSelected = new EventEmitter<{date: string, time: string}>();

  days: Day[] = [
    { name: 'LUN', date: '17 fév', spots: ['5:30', '7:00', '8:30'] },
    { name: 'MAR', date: '18 fév', spots: ['5:30', '7:00', '8:30'] },
    { name: 'MER', date: '19 fév', spots: ['5:30', '7:00', '8:30'] },
    { name: 'JEU', date: '20 fév', spots: ['5:30', '7:00', '8:30'] },
    { name: 'VEN', date: '21 fév', spots: ['5:30', '7:00', '8:30'] },
    { name: 'SAM', date: '22 fév', spots: ['5:30', '7:00', '8:30'] },
    { name: 'DIM', date: '23 fév', spots: ['5:30', '7:00', '8:30'] }
  ];

  previousWeek() {
    // Implement previous week navigation
  }

  nextWeek() {
    // Implement next week navigation
  }

  togglePeopleDropdown() {
    // Implement people selector dropdown
  }

  isSpotSelected(date: string, time: string): boolean {
    return this.selectedDate === date && this.selectedTime === time;
  }

  onSpotSelected(date: string, time: string) {
    this.selectedDate = date;
    this.selectedTime = time;
    this.bookingSelected.emit({ date, time });
  }
}