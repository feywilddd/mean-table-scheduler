// calendar-spot.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-calendar-spot',
  standalone: true,
  templateUrl: './calendar-spot.component.html',
  styleUrl: './calendar-spot.component.css'
})
export class CalendarSpotComponent {
  @Input() time: string = '';
  @Input() isAvailable: boolean = true;
  @Input() isSelected: boolean = false;
  @Output() spotSelected = new EventEmitter<string>();

  onSpotClick() {
    if (this.isAvailable) {
      this.spotSelected.emit(this.time);
    }
  }
}