import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RefreshService {
  // Subject to emit events
  private refreshCalendarSource = new Subject<void>();
  
  // Observable that components can subscribe to
  refreshCalendar$ = this.refreshCalendarSource.asObservable();
  
  // Method to trigger a refresh
  triggerCalendarRefresh(): void {
    console.log('Calendar refresh triggered');
    this.refreshCalendarSource.next();
  }
}