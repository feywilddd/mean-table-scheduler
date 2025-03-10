import { Component, OnInit, Output, EventEmitter, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendarSpotComponent } from '../calendar-spot/calendar-spot.component';
import { BookingModalComponent } from '../booking-modal/booking-modal.component';
import { ReservationService } from '../../services/reservation.service';
import { BookingService } from '../../services/booking.service';
import { AuthService } from '../../services/auth.service';

interface Day {
  name: string;
  date: string;
  dateObj: Date;
  spots: Spot[];
}

interface Spot {
  time: string;
  service_id: string;
  isAvailable: boolean;
  availableTables?: any[];
}

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, CalendarSpotComponent, BookingModalComponent],
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.css']
})
export class CalendarComponent implements OnInit {
  // Services injected directly 
  private reservationService = inject(ReservationService);
  private bookingService = inject(BookingService);
  private authService = inject(AuthService);

  // Using signals for reactive state management
  private numberOfPeopleSignal = signal<number>(2);
  private currentWeekStartSignal = signal<Date>(this.getStartOfWeek(new Date()));
  private daysSignal = signal<Day[]>([]);
  private loadingSignal = signal<boolean>(false);
  private showPeopleDropdownSignal = signal<boolean>(false);
  private selectedDateSignal = signal<string | null>(null);
  private selectedTimeSignal = signal<string | null>(null);
  private selectedServiceIdSignal = signal<string | null>(null);
  private selectedTableIdSignal = signal<string | null>(null);
  private availableTablesSignal = signal<any[]>([]);
  
  // Added signal for showing the booking modal
  private showBookingModalSignal = signal<boolean>(false);
  
  // Computed values
  public isLoading = computed(() => this.loadingSignal());
  public days = computed(() => this.daysSignal());
  public selectedDate = computed(() => this.selectedDateSignal());
  public selectedTime = computed(() => this.selectedTimeSignal());
  public selectedServiceId = computed(() => this.selectedServiceIdSignal());
  public selectedTableId = computed(() => this.selectedTableIdSignal());
  public hasSelection = computed(() => !!this.selectedDateSignal() && !!this.selectedTimeSignal());
  public availableTables = computed(() => this.availableTablesSignal());
  public hasAvailableTables = computed(() => this.availableTablesSignal().length > 0);
  public showBookingModal = computed(() => this.showBookingModalSignal());
  public weekDisplay = computed(() => {
    const startDate = this.currentWeekStartSignal();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    
    const start = startDate.getDate();
    const startMonth = startDate.toLocaleString('fr-FR', { month: 'short' });
    const end = endDate.getDate();
    const endMonth = endDate.toLocaleString('fr-FR', { month: 'short' });
    
    return `${start} ${startMonth} - ${end} ${endMonth}`;
  });
  
  // Constants and config
  restaurantId: string = ''; // Set default restaurant ID
  peopleOptions: number[] = [1, 2, 3, 4, 5, 6];
  
  @Output() bookingSelected = new EventEmitter<{
    date: string, 
    time: string, 
    serviceId: string, 
    numberOfPeople: number,
    tableId: string
  }>();

  ngOnInit(): void {
    this.loadWeek();
  }
  
  // Get number of people
  get numberOfPeople(): number {
    return this.numberOfPeopleSignal();
  }
  
  // Is people dropdown showing
  get showPeopleDropdown(): boolean {
    return this.showPeopleDropdownSignal();
  }

  // Get start date of the week (Monday)
  getStartOfWeek(date: Date): Date {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
    const monday = new Date(date);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  }

  // Load week data
  loadWeek(): void {
    this.loadingSignal.set(true);
    this.resetSelection();
    
    // Calculate week end date (Sunday)
    const startDate = this.currentWeekStartSignal();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    
    console.log(`Loading services for week: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    // Load all services
    this.reservationService.getAllServices().subscribe({
      next: (services) => {
        console.log(`Loaded ${services.length} services from the backend`);
        
        // Group services by day
        const servicesByDay = this.groupServicesByDay(services);
        const days: Day[] = [];
        
        // Create days array
        for (let i = 0; i < 7; i++) {
          const currentDate = new Date(startDate);
          currentDate.setDate(currentDate.getDate() + i);
          
          const dateStr = this.reservationService.formatDate(currentDate);
          const dayName = this.reservationService.getDayName(currentDate);
          const dayServices = servicesByDay[currentDate.toDateString()] || [];
          
          // Create spots from services
          const spots = dayServices.map((service: { start_time: string | Date; service_id: any; }) => ({
            time: this.reservationService.formatTime(service.start_time),
            service_id: service.service_id,
            isAvailable: false  // Default to unavailable until we check
          }));
          
          // Sort spots by time
          spots.sort((a: { time: string; }, b: { time: any; }) => a.time.localeCompare(b.time));
          
          days.push({
            name: dayName,
            date: dateStr,
            dateObj: currentDate,
            spots: spots
          });
        }
        
        // Set days in the UI
        this.daysSignal.set(days);
        
        // Check availability for all spots
        if (days.some(day => day.spots.length > 0)) {
          this.checkAvailabilityForAllDays(days);
        } else {
          this.loadingSignal.set(false);
        }
      },
      error: (error) => {
        console.error('Error loading services:', error);
        this.loadingSignal.set(false);
        this.daysSignal.set([]); // Just set empty days on error
      }
    });
  }

  // Group services by day, ignoring the year (match only month and day)
  groupServicesByDay(services: any[]): any {
    const grouped: any = {};
    
    services.forEach(service => {
      const serviceDate = new Date(service.start_time);
      
      // Iterate through our week dates to find matching month/day
      const startDate = this.currentWeekStartSignal();
      for (let i = 0; i < 7; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(currentDate.getDate() + i);
        
        // Check if month and day match (ignore year)
        if (serviceDate.getMonth() === currentDate.getMonth() && 
            serviceDate.getDate() === currentDate.getDate()) {
          
          const dateKey = currentDate.toDateString();
          if (!grouped[dateKey]) {
            grouped[dateKey] = [];
          }
          
          grouped[dateKey].push(service);
          break; // Found a match, no need to continue
        }
      }
    });
    
    return grouped;
  }

  // Navigate to previous week
  previousWeek(): void {
    if (this.loadingSignal()) return;
    
    const prevWeek = new Date(this.currentWeekStartSignal());
    prevWeek.setDate(prevWeek.getDate() - 7);
    this.currentWeekStartSignal.set(prevWeek);
    this.loadWeek();
  }

  // Navigate to next week
  nextWeek(): void {
    if (this.loadingSignal()) return;
    
    const nextWeek = new Date(this.currentWeekStartSignal());
    nextWeek.setDate(nextWeek.getDate() + 7);
    this.currentWeekStartSignal.set(nextWeek);
    this.loadWeek();
  }
  
  // Reset selection
  resetSelection(): void {
    this.selectedDateSignal.set(null);
    this.selectedTimeSignal.set(null);
    this.selectedServiceIdSignal.set(null);
    this.selectedTableIdSignal.set(null);
    this.availableTablesSignal.set([]);
    this.showBookingModalSignal.set(false);
  }

  // Toggle people dropdown
  togglePeopleDropdown(): void {
    this.showPeopleDropdownSignal.update(value => !value);
  }

  // Select number of people
  selectPeople(number: number): void {
    this.numberOfPeopleSignal.set(number);
    this.showPeopleDropdownSignal.set(false);
    
    // If we have days displayed, recheck availability for the new party size
    const currentDays = this.days();
    if (currentDays.length > 0) {
      this.loadingSignal.set(true);
      this.checkAvailabilityForAllDays(currentDays);
    }
  }

  // Check if a spot is selected
  isSpotSelected(date: string, time: string): boolean {
    return this.selectedDateSignal() === date && this.selectedTimeSignal() === time;
  }

  // Handle spot selection
  onSpotSelected(day: Day, spot: Spot): void {
    if (!spot.isAvailable || this.loadingSignal()) return;
    
    
    this.selectedDateSignal.set(day.date);
    this.selectedTimeSignal.set(spot.time);
    this.selectedServiceIdSignal.set(spot.service_id);
    
    // Use the pre-checked available tables
    if (spot.availableTables && spot.availableTables.length > 0) {
      // Filter tables to ensure they have enough seats
      const currentPeople = this.numberOfPeopleSignal();
      const suitableTables = spot.availableTables.filter(table => 
        table.seats >= currentPeople
      );
      
      if (suitableTables.length > 0) {
        // Sort by capacity (smallest suitable table first)
        suitableTables.sort((a, b) => a.seats - b.seats);
        
        this.availableTablesSignal.set(suitableTables);
        this.selectedTableIdSignal.set(suitableTables[0].table_id);
        
        // Show the booking modal
        this.showBookingModalSignal.set(true);
      } else {
        console.warn('No tables with enough capacity for', currentPeople, 'people');
        // Could show a message to the user here
        this.resetSelection();
      }
    } else {
      // Fallback in case we don't have available tables
      this.availableTablesSignal.set([]);
      this.selectedTableIdSignal.set(null);
    }
  }

  // Close the booking modal
  closeBookingModal(): void {
    this.showBookingModalSignal.set(false);
    
    // Reset selection when closing the modal
    // This removes the focus/highlight from the selected spot
    this.selectedDateSignal.set(null);
    this.selectedTimeSignal.set(null);
  }

  // Confirm booking from modal
  confirmBooking(): void {
    this.emitSelection();
    this.showBookingModalSignal.set(false);
  }

  // Check availability for all services in all days
  checkAvailabilityForAllDays(days: Day[]): void {
    console.log('Checking availability for all days and slots');
    
    // Create a copy of days that we'll update
    const updatedDays = [...days];
    const allPromises: Promise<void>[] = [];
    
    // For each day
    updatedDays.forEach((day, dayIndex) => {
      // For each spot in the day
      day.spots.forEach((spot, spotIndex) => {
        // Create a promise for this availability check
        const checkPromise = new Promise<void>((resolve) => {
          this.reservationService.getAvailableTables(
            spot.service_id,
            this.numberOfPeopleSignal(),
            this.restaurantId
          ).subscribe({
            next: (tables) => {
              // First set all available tables
              const hasAvailableTables = tables.length > 0;
              
              // Check if there are any tables with enough capacity
              const suitableTables = tables.filter(table => 
                table.seats >= this.numberOfPeopleSignal()
              );
              
              // Only mark as available if there are tables with enough capacity
              updatedDays[dayIndex].spots[spotIndex].isAvailable = suitableTables.length > 0;
              updatedDays[dayIndex].spots[spotIndex].availableTables = tables;
              
              // Log if we have tables but none with enough capacity
              if (hasAvailableTables && suitableTables.length === 0) {
                console.log(`Service ${spot.service_id} has tables, but none with enough capacity for ${this.numberOfPeopleSignal()} people`);
              }
              
              resolve();
            },
            error: () => {
              // On error, mark as unavailable
              updatedDays[dayIndex].spots[spotIndex].isAvailable = false;
              updatedDays[dayIndex].spots[spotIndex].availableTables = [];
              resolve();
            }
          });
        });
        
        allPromises.push(checkPromise);
      });
    });
    
    // Wait for all availability checks to complete
    Promise.all(allPromises).then(() => {
      console.log('All availability checks completed');
      this.daysSignal.set(updatedDays);
      this.loadingSignal.set(false);
    });
  }

  // Emit the selected booking details
  emitSelection(): void {
    if (this.selectedDateSignal() && 
        this.selectedTimeSignal() && 
        this.selectedServiceIdSignal() && 
        this.selectedTableIdSignal()) {
      
      const selection = {
        date: this.selectedDateSignal()!,
        time: this.selectedTimeSignal()!,
        serviceId: this.selectedServiceIdSignal()!,
        numberOfPeople: this.numberOfPeopleSignal(),
        tableId: this.selectedTableIdSignal()!
      };
      
      this.bookingSelected.emit(selection);
      
      // Also update the booking service
      this.bookingService.setBookingSelection(selection);
    }
  }
}