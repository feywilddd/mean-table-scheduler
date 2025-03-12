import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ReservationService } from '../../services/reservation.service';
import { BookingService } from '../../services/booking.service';
import { RefreshService } from '../../services/refresh.service';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';

import { Reservation as ServiceReservation } from '../../services/reservation.service';
import { RouterLink } from '@angular/router';

interface Reservation {
  reservation_id: string;
  reservation_service_instance_id: string;
  reservation_user_id?: string;
  user_id?: string;
  reservation_table_id?: string;
  table_id?: string;
  seats_taken: number;
  status: string;
  created_at: string;
  serviceInstance: {
    service_instance_id: string;
    service_date: string;
    start_time: string;
    service_id?: string;
  };
  user: {
    user_id: string;
    name: string;
    email: string;
    phone?: string;
  };
  table: {
    table_id: string;
    name: string;
    seats: number;
  };
}

interface FilterState {
  date: string;
  status: string;
  searchTerm: string;
}

@Component({
  selector: 'app-admin-booking',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './admin-booking.component.html',
  styleUrls: ['./admin-booking.component.css']
})
export class AdminBookingComponent implements OnInit {
  // Services
  private reservationService = inject(ReservationService);
  private bookingService = inject(BookingService);
  private refreshService = inject(RefreshService);
  private fb = inject(FormBuilder);

  // Data
  reservations: Reservation[] = [];
  filteredReservations: Reservation[] = [];
  availableTables: any[] = [];
  serviceInstances: any[] = [];
  users: any[] = [];

  // UI State
  isLoading = true;
  modalMode: 'create' | 'edit' | 'view' | 'delete' | null = null;
  selectedReservation: Reservation | null = null;
  isFormSubmitting = false;
  errorMessage = '';
  successMessage = '';
  
  // Filters
  filterState: FilterState = {
    date: '',
    status: 'all',
    searchTerm: '',
  };
  
  // Form
  reservationForm: FormGroup;
  
  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalReservations = 0;
  
  constructor() {
    this.reservationForm = this.fb.group({
      serviceInstanceId: ['', Validators.required],
      userId: ['', Validators.required],
      seatsTaken: [2, [Validators.required, Validators.min(1), Validators.max(6)]]
    });
  }
  
  ngOnInit(): void {
    this.loadReservations();
    this.refreshService.calendarRefresh$.subscribe(() => {
      this.loadReservations();
    });
  }
  
  // Load all reservations with optional date filter
  loadReservations(): void {
    this.isLoading = true;
    
    // Get all reservations (admin endpoint needed)
    this.reservationService.getAllReservations().subscribe({
      next: (data: any[]) => {
        // Cast or transform the data to match your Reservation interface
        this.reservations = data as Reservation[];
        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading reservations:', error);
        this.errorMessage = 'Erreur lors du chargement des réservations';
        this.isLoading = false;
      }
    });
  }
  
  // Load supporting data (service instances, tables, users)
  loadSupportingData(): void {
    // Load service instances
    this.reservationService.getAllServiceInstances().subscribe(data => {
      this.serviceInstances = data;
    });
    
    // Load all tables
    this.reservationService.getAllTables().subscribe(data => {
      this.availableTables = data;
    });
    
    // Load all users (admin endpoint needed)
    this.reservationService.getAllUsers().subscribe(data => {
      this.users = data;
    });
  }
  
  // Apply filters
  applyFilters(): void {
    let filtered = [...this.reservations];
    
    // Filter by status
    if (this.filterState.status !== 'all') {
      filtered = filtered.filter(res => res.status === this.filterState.status);
    }
    
    // Filter by search term (user name or email)
    if (this.filterState.searchTerm) {
      const term = this.filterState.searchTerm.toLowerCase();
      filtered = filtered.filter(res => 
        res.user.name.toLowerCase().includes(term) || 
        res.user.email.toLowerCase().includes(term) ||
        (res.user.phone && res.user.phone.includes(term))
      );
    }
    
    // Sort by date and time
    filtered.sort((a, b) => {
      // First, compare by date
      const dateA = new Date(a.serviceInstance.service_date);
      const dateB = new Date(b.serviceInstance.service_date);
      
      if (dateA.getTime() !== dateB.getTime()) {
        return dateA.getTime() - dateB.getTime();
      }
      
      // If same date, compare by time
      return a.serviceInstance.start_time.localeCompare(b.serviceInstance.start_time);
    });
    
    this.filteredReservations = filtered;
    this.totalReservations = filtered.length;
  }
  
  // Format date
  formatDate(dateStr: string): string {
    if (!dateStr) {
      return 'Date inconnue';
    }
    
    // Parse the date parts from YYYY-MM-DD format
    const dateParts = dateStr.split('T')[0].split('-');
    if (dateParts.length !== 3) {
      return 'Date inconnue';
    }
    
    const year = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10) - 1; // JS months are 0-indexed
    const day = parseInt(dateParts[2], 10);
    
    // Create date with year, month, day in the local timezone
    const date = new Date(year, month, day);
    
    return date.toLocaleDateString('fr-FR', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }
  
  // Format time
  formatTime(timeStr: string): string {
    if (!timeStr) {
      return 'Heure inconnue';
    }
    
    const timeParts = timeStr.split(':');
    if (timeParts.length < 2) {
      return 'Heure inconnue';
    }
    
    return `${timeParts[0]}:${timeParts[1]}`;
  }
  
  // Format created at timestamp
  formatCreatedAt(dateStr: string): string {
    if (!dateStr) {
      return 'Date inconnue';
    }
    
    const date = new Date(dateStr);
    return date.toLocaleString('fr-FR');
  }
  
  // Open modal in various modes
  openCreateModal(): void {
    this.loadSupportingData();
    this.modalMode = 'create';
    this.reservationForm.reset({
      seatsTaken: 2,
      status: 'confirmed'
    });
  }
  
  openEditModal(reservation: Reservation): void {
    this.loadSupportingData();
    this.selectedReservation = reservation;
    this.modalMode = 'edit';
    
    // Use patchValue instead of setValue to update only specific fields
    this.reservationForm.patchValue({
      serviceInstanceId: reservation.reservation_service_instance_id,
      userId: reservation.reservation_user_id || reservation.user_id || reservation.user.user_id,
      seatsTaken: reservation.seats_taken
    });
  }
  
  openViewModal(reservation: Reservation): void {
    this.selectedReservation = reservation;
    this.modalMode = 'view';
  }
  
  openDeleteModal(reservation: Reservation): void {
    this.selectedReservation = reservation;
    this.modalMode = 'delete';
  }
  
  closeModal(): void {
    this.modalMode = null;
    this.selectedReservation = null;
    this.errorMessage = '';
    this.successMessage = '';
  }
  
  // Handle select events
  setStatusFilter(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.filterState.status = target.value;
    this.applyFilters();
  }
  
  setDateFilter(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.filterState.date = input.value;
    this.loadReservations();
  }
  
  setSearchTerm(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.filterState.searchTerm = input.value;
    this.applyFilters();
  }
  
  // CRUD Operations
 // Update your createReservation method in the AdminBookingComponent
createReservation(): void {
  if (this.reservationForm.invalid || this.isFormSubmitting) return;
  
  this.isFormSubmitting = true;
  this.errorMessage = '';
  
  const formData = this.reservationForm.value;
  
  // Check if the service instance exists before sending the request
  console.log('Creating reservation with service instance ID:', formData.serviceInstanceId);
  
  // Use the admin endpoint instead if available
  this.reservationService.adminCreateReservation(
    formData.serviceInstanceId, 
    formData.userId,
    formData.seatsTaken
  ).subscribe({
    next: () => {
      this.successMessage = 'Réservation créée avec succès';
      this.isFormSubmitting = false;
      this.loadReservations();
      // Close modal after short delay
      setTimeout(() => this.closeModal(), 1500);
    },
    error: (error) => {
      this.errorMessage = error.message || 'Erreur lors de la création de la réservation';
      this.isFormSubmitting = false;
    }
  });
}
  
  // Fixed updateReservation method - adjusted to match service method signature
  updateReservation(): void {
    if (!this.selectedReservation || this.reservationForm.invalid || this.isFormSubmitting) return;
    
    this.isFormSubmitting = true;
    this.errorMessage = '';
    
    const formData = this.reservationForm.value;
    
    // Create an admin endpoint to handle all fields
    this.reservationService.adminUpdateReservation(
      this.selectedReservation.reservation_id,
      formData.serviceInstanceId,
      formData.userId,
      formData.seatsTaken
    ).subscribe({
      next: () => {
        this.successMessage = 'Réservation mise à jour avec succès';
        this.isFormSubmitting = false;
        this.loadReservations();
        // Close modal after short delay
        setTimeout(() => this.closeModal(), 1500);
      },
      error: (error) => {
        this.errorMessage = error.message || 'Erreur lors de la mise à jour de la réservation';
        this.isFormSubmitting = false;
      }
    });
  }
  
  deleteReservation(): void {
    if (!this.selectedReservation || this.isFormSubmitting) return;
    
    this.isFormSubmitting = true;
    this.errorMessage = '';
    
    this.reservationService.deleteReservation(this.selectedReservation.reservation_id).subscribe({
      next: () => {
        this.successMessage = 'Réservation supprimée avec succès';
        this.isFormSubmitting = false;
        this.loadReservations();
        // Close modal after short delay
        setTimeout(() => this.closeModal(), 1500);
      },
      error: (error) => {
        this.errorMessage = error.message || 'Erreur lors de la suppression de la réservation';
        this.isFormSubmitting = false;
      }
    });
  }
  
  // Pagination
  get paginatedReservations(): Reservation[] {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredReservations.slice(start, end);
  }
  
  get totalPages(): number {
    return Math.ceil(this.totalReservations / this.pageSize);
  }
  
  setPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
  }
  
  // Checks if a table has enough seats
  hasEnoughSeats(tableId: string, requiredSeats: number): boolean {
    const table = this.availableTables.find(t => t.table_id === tableId);
    return table ? table.seats >= requiredSeats : false;
  }
  
  // Service instance helpers
  getServiceInstanceDateAndTime(instanceId: string): { date: string, time: string } {
    const instance = this.serviceInstances.find(si => si.service_instance_id === instanceId);
    if (!instance) return { date: 'N/A', time: 'N/A' };
    
    return {
      date: this.formatDate(instance.service_date),
      time: this.formatTime(instance.start_time)
    };
  }
  
  // Get user display name
  getUserDisplay(userId: string): string {
    const user = this.users.find(u => u.user_id === userId);
    return user ? `${user.name} (${user.email})` : 'Utilisateur inconnu';
  }
  
  // Get table display info
  getTableDisplay(tableId: string): string {
    const table = this.availableTables.find(t => t.table_id === tableId);
    return table ? `${table.name} (${table.seats} places)` : 'Table inconnue';
  }
}