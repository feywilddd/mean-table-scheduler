import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { UsersService, UserResponse } from '../../services/users.service';

@Component({
  selector: 'app-admin-users',
  templateUrl: './admin-users.component.html',
  styleUrls: ['./admin-users.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, DatePipe]
})
export class AdminUsersComponent implements OnInit {
  users: UserResponse[] = [];
  selectedUser: UserResponse | null = null;
  isLoading = false;
  isEditing = false;
  isCreating = false;
  isSubmitting = false;
  errorMessage = '';
  successMessage = '';
  showDeleteModal = false;
  showRestoreModal = false;
  
  editForm = {
    name: '',
    email: '',
    user_role: '',
    newPassword: '',
    confirmPassword: ''
  };

  newUserForm = {
    name: '',
    email: '',
    user_role: 'user', // Default role
    password: '',
    confirmPassword: ''
  };

  constructor(private usersService: UsersService) { }

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading = true;
    this.errorMessage = '';
    
    this.usersService.getUsers()
      .subscribe({
        next: (users) => {
          this.users = users;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading users', error);
          this.errorMessage = error.message || 'Impossible de charger les utilisateurs. Veuillez réessayer.';
          this.isLoading = false;
        }
      });
  }

  editUser(user: UserResponse): void {
    this.selectedUser = user;
    this.editForm = {
      name: user.name,
      email: user.email,
      user_role: user.user_role,
      newPassword: '',
      confirmPassword: ''
    };
    this.isEditing = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  updateUser(): void {
    if (!this.selectedUser) return;
    
    if (this.editForm.newPassword !== this.editForm.confirmPassword) {
      this.errorMessage = 'Les mots de passe ne correspondent pas.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    
    const updatedUser = {
      name: this.editForm.name,
      email: this.editForm.email,
      user_role: this.editForm.user_role,
      ...(this.editForm.newPassword ? { password: this.editForm.newPassword } : {})
    };

    this.usersService.updateUser(this.selectedUser.user_id, updatedUser)
      .subscribe({
        next: () => {
          this.successMessage = 'Utilisateur mis à jour avec succès.';
          this.isSubmitting = false;
          this.isEditing = false;
          this.loadUsers();
          
          // Clear success message after 3 seconds
          setTimeout(() => {
            this.successMessage = '';
          }, 3000);
        },
        error: (error) => {
          this.errorMessage = error.message || 'Impossible de mettre à jour l\'utilisateur. Veuillez réessayer.';
          this.isSubmitting = false;
        }
      });
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.selectedUser = null;
    this.errorMessage = '';
  }

  startCreateUser(): void {
    this.isCreating = true;
    this.errorMessage = '';
    this.successMessage = '';
    
    // Reset form
    this.newUserForm = {
      name: '',
      email: '',
      user_role: 'user',
      password: '',
      confirmPassword: ''
    };
  }

  createUser(): void {
    if (this.newUserForm.password !== this.newUserForm.confirmPassword) {
      this.errorMessage = 'Les mots de passe ne correspondent pas.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    
    const newUser = {
      name: this.newUserForm.name,
      email: this.newUserForm.email,
      password: this.newUserForm.password,
      user_role: this.newUserForm.user_role
    };

    this.usersService.createUser(newUser)
      .subscribe({
        next: () => {
          this.successMessage = 'Utilisateur créé avec succès.';
          this.isSubmitting = false;
          this.isCreating = false;
          this.loadUsers();
          
          // Clear success message after 3 seconds
          setTimeout(() => {
            this.successMessage = '';
          }, 3000);
        },
        error: (error) => {
          this.errorMessage = error.message || 'Impossible de créer l\'utilisateur. Veuillez réessayer.';
          this.isSubmitting = false;
        }
      });
  }

  cancelCreate(): void {
    this.isCreating = false;
    this.errorMessage = '';
  }

  confirmDeleteUser(user: UserResponse): void {
    this.selectedUser = user;
    this.showDeleteModal = true;
  }

  deleteUser(): void {
    if (!this.selectedUser) return;
    
    this.isSubmitting = true;
    
    this.usersService.deleteUser(this.selectedUser.user_id)
      .subscribe({
        next: () => {
          this.successMessage = 'Utilisateur supprimé avec succès.';
          this.isSubmitting = false;
          this.showDeleteModal = false;
          this.selectedUser = null;
          this.loadUsers();
          
          // Clear success message after 3 seconds
          setTimeout(() => {
            this.successMessage = '';
          }, 3000);
        },
        error: (error) => {
          this.errorMessage = error.message || 'Impossible de supprimer l\'utilisateur. Veuillez réessayer.';
          this.isSubmitting = false;
          this.showDeleteModal = false;
        }
      });
  }

  cancelDelete(): void {
    this.showDeleteModal = false;
    this.selectedUser = null;
  }

  confirmRestoreUser(user: UserResponse): void {
    this.selectedUser = user;
    this.showRestoreModal = true;
  }

  restoreUser(): void {
    if (!this.selectedUser) return;
    
    this.isSubmitting = true;
    
    this.usersService.restoreUser(this.selectedUser.user_id)
      .subscribe({
        next: () => {
          this.successMessage = 'Utilisateur restauré avec succès.';
          this.isSubmitting = false;
          this.showRestoreModal = false;
          this.selectedUser = null;
          this.loadUsers();
          
          // Clear success message after 3 seconds
          setTimeout(() => {
            this.successMessage = '';
          }, 3000);
        },
        error: (error) => {
          this.errorMessage = error.message || 'Impossible de restaurer l\'utilisateur. Veuillez réessayer.';
          this.isSubmitting = false;
          this.showRestoreModal = false;
        }
      });
  }

  cancelRestore(): void {
    this.showRestoreModal = false;
    this.selectedUser = null;
  }
}