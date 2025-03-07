// src/app/components/tables-management/tables-management.component.ts
import { Component, OnInit } from '@angular/core';
import { TableService, Table, Restaurant } from '../../services/table.service';
import { Router, RouterLink } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-tables-management',
  templateUrl: './tables-management.component.html',
  styleUrls: ['./tables-management.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, RouterLink]
})
export class TablesManagementComponent implements OnInit {
  // Tables and restaurants
  tables: Table[] = [];
  restaurants: Restaurant[] = [];
  
  // UI state
  isLoading = true;
  isSubmitting = false;
  errorMessage = '';
  successMessage = '';
  
  // Edit/Create state
  isEditing = false;
  isCreating = false;
  selectedTable: Table | null = null;
  
  // Delete/Restore modals
  showDeleteModal = false;
  showRestoreModal = false;
  
  // Forms
  editForm: {
    table_restaurant_id: string;
    number: number;
    seats: number;
  } = {
    table_restaurant_id: '',
    number: 0,
    seats: 0
  };
  
  newTableForm: {
    table_restaurant_id: string;
    number: number;
    seats: number;
  } = {
    table_restaurant_id: '',
    number: 0,
    seats: 0
  };

  constructor(
    private tableService: TableService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadData();
  }

  // Load tables and restaurants
  loadData(): void {
    this.isLoading = true;
    this.errorMessage = '';
    
    // Load both tables and restaurants
    this.tableService.getAllTables().subscribe({
      next: (tables) => {
        this.tables = tables;
        
        // Now load restaurants
        this.tableService.getAllRestaurants().subscribe({
          next: (restaurants) => {
            this.restaurants = restaurants;
            this.isLoading = false;
          },
          error: (error) => {
            this.errorMessage = 'Erreur lors du chargement des restaurants';
            console.error('Error loading restaurants:', error);
            this.isLoading = false;
          }
        });
      },
      error: (error) => {
        this.errorMessage = 'Erreur lors du chargement des tables';
        console.error('Error loading tables:', error);
        this.isLoading = false;
      }
    });
  }

  // Get restaurant name by ID
  getRestaurantName(restaurantId: string): string {
    const restaurant = this.restaurants.find(r => r.restaurant_id === restaurantId);
    return restaurant ? restaurant.name : 'Restaurant inconnu';
  }

  // Start table creation
  startCreateTable(): void {
    this.isCreating = true;
    this.newTableForm = {
      table_restaurant_id: this.restaurants.length > 0 ? this.restaurants[0].restaurant_id : '',
      number: 1,
      seats: 2
    };
  }

  // Cancel table creation
  cancelCreate(): void {
    this.isCreating = false;
    this.errorMessage = '';
  }

  // Create a new table
  createTable(): void {
    // Validate form
    if (!this.newTableForm.table_restaurant_id || !this.newTableForm.number || !this.newTableForm.seats) {
      this.errorMessage = 'Restaurant, numéro de table et nombre de places sont requis';
      return;
    }
    
    this.isSubmitting = true;
    this.errorMessage = '';
    
    this.tableService.createTable({
      table_restaurant_id: this.newTableForm.table_restaurant_id,
      number: this.newTableForm.number,
      seats: this.newTableForm.seats
    }).subscribe({
      next: (createdTable) => {
        this.isSubmitting = false;
        this.isCreating = false;
        this.successMessage = 'Table créée avec succès';
        this.loadData();
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (error) => {
        this.errorMessage = error.message || 'Erreur lors de la création de la table';
        this.isSubmitting = false;
        console.error('Error creating table:', error);
      }
    });
  }
  

  // Edit table
  editTable(table: Table): void {
    this.selectedTable = table;
    this.isEditing = true;
    this.editForm = {
      table_restaurant_id: table.table_restaurant_id,
      number: table.number,
      seats: table.seats
    };
  }

  // Cancel table edit
  cancelEdit(): void {
    this.selectedTable = null;
    this.isEditing = false;
    this.errorMessage = '';
  }

  // Update table
  updateTable(): void {
    // Validate form
    if (!this.editForm.table_restaurant_id || !this.editForm.number || !this.editForm.seats) {
      this.errorMessage = 'Restaurant, numéro de table et nombre de places sont requis';
      return;
    }
    
    if (!this.selectedTable) {
      this.errorMessage = 'Aucune table sélectionnée';
      return;
    }
    
    this.isSubmitting = true;
    this.errorMessage = '';
    
    this.tableService.updateTable(this.selectedTable.table_id, {
      table_restaurant_id: this.editForm.table_restaurant_id,
      number: this.editForm.number,
      seats: this.editForm.seats
    }).subscribe({
      next: (updatedTable) => {
        this.isSubmitting = false;
        this.isEditing = false;
        this.selectedTable = null;
        this.successMessage = 'Table mise à jour avec succès';
        this.loadData();
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (error) => {
        this.errorMessage = error.message || 'Erreur lors de la mise à jour de la table';
        this.isSubmitting = false;
        console.error('Error updating table:', error);
      }
    });
  }

  // Confirm table deletion
  confirmDeleteTable(table: Table): void {
    this.selectedTable = table;
    this.showDeleteModal = true;
  }

  // Cancel deletion
  cancelDelete(): void {
    this.selectedTable = null;
    this.showDeleteModal = false;
  }

  // Delete table
  deleteTable(): void {
    if (!this.selectedTable) {
      this.errorMessage = 'Aucune table sélectionnée';
      return;
    }
    
    this.isSubmitting = true;
    
    this.tableService.deleteTable(this.selectedTable.table_id).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.showDeleteModal = false;
        this.selectedTable = null;
        this.successMessage = 'Table supprimée avec succès';
        this.loadData();
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (error) => {
        this.errorMessage = error.message || 'Erreur lors de la suppression de la table';
        this.isSubmitting = false;
        this.showDeleteModal = false; // Fermer le modal en cas d'erreur
        console.error('Error deleting table:', error);
      }
    });
  }

  // Confirm table restoration
  confirmRestoreTable(table: Table): void {
    this.selectedTable = table;
    this.showRestoreModal = true;
  }

  // Cancel restoration
  cancelRestore(): void {
    this.selectedTable = null;
    this.showRestoreModal = false;
  }

  // Restore table
  restoreTable(): void {
    if (!this.selectedTable) {
      this.errorMessage = 'Aucune table sélectionnée';
      return;
    }
    
    this.isSubmitting = true;
    
    this.tableService.restoreTable(this.selectedTable.table_id).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.showRestoreModal = false;
        this.selectedTable = null;
        this.successMessage = 'Table restaurée avec succès';
        this.loadData();
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (error) => {
        this.errorMessage = error.message || 'Erreur lors de la restauration de la table';
        this.isSubmitting = false;
        this.showRestoreModal = false; // Fermer le modal en cas d'erreur
        console.error('Error restoring table:', error);
      }
    });
  }

  // View deleted tables
  viewDeletedTables(): void {
    this.router.navigate(['/admin/tables/deleted']);
  }
}