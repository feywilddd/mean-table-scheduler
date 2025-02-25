import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, FormsModule,DatePipe,RouterLink],
  templateUrl: './user-profile.component.html',
  styleUrl: './user-profile.component.css'
})
export class UserProfileComponent implements OnInit {
  user: any = null;
  isEditing: boolean = false;
  isLoading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';
  
  // Form data
  editForm = {
    name: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };
  
  private authService = inject(AuthService);
  
  ngOnInit(): void {
    this.loadUserProfile();
  }
  
  loadUserProfile(): void {
    this.isLoading = true;
    
    // Assuming your auth service has a method to get current user details
    this.authService.getCurrentUser().subscribe({
      next: (userData) => {
        this.user = userData;
        
        // Initialize form with current values
        this.editForm.name = userData.name;
        this.editForm.email = userData.email;
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading user profile', error);
        this.errorMessage = 'Impossible de charger les informations du profil.';
        this.isLoading = false;
      }
    });
  }
  
  toggleEdit(): void {
    this.isEditing = !this.isEditing;
    
    // Reset messages when toggling edit mode
    this.errorMessage = '';
    this.successMessage = '';
    
    // Reset password fields
    this.editForm.currentPassword = '';
    this.editForm.newPassword = '';
    this.editForm.confirmPassword = '';
  }
  
  saveProfile(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    
    // Validate password fields if user is trying to change password
    if (this.editForm.newPassword) {
      if (!this.editForm.currentPassword) {
        this.errorMessage = 'Veuillez entrer votre mot de passe actuel.';
        this.isLoading = false;
        return;
      }
      
      if (this.editForm.newPassword !== this.editForm.confirmPassword) {
        this.errorMessage = 'Les nouveaux mots de passe ne correspondent pas.';
        this.isLoading = false;
        return;
      }
    }
    
    // Prepare the update data
    const updateData: any = {
      name: this.editForm.name,
      email: this.editForm.email
    };
    
    // Only include password info if user is changing it
    if (this.editForm.newPassword) {
      updateData.currentPassword = this.editForm.currentPassword;
      updateData.newPassword = this.editForm.newPassword;
    }
    
    // Assuming your auth service has a method to update user profile
    this.authService.updateProfile(updateData).subscribe({
      next: (response) => {
        this.user = response; // Update with the returned user data
        this.successMessage = 'Profil mis à jour avec succès.';
        this.isLoading = false;
        this.isEditing = false;
        
        // Reset password fields
        this.editForm.currentPassword = '';
        this.editForm.newPassword = '';
        this.editForm.confirmPassword = '';
      },
      error: (error) => {
        console.error('Error updating profile', error);
        this.errorMessage = error.message || 'Erreur lors de la mise à jour du profil.';
        this.isLoading = false;
      }
    });
  }
  
  cancelEdit(): void {
    // Reset form to original values
    if (this.user) {
      this.editForm.name = this.user.name;
      this.editForm.email = this.user.email;
    }
    
    // Reset password fields
    this.editForm.currentPassword = '';
    this.editForm.newPassword = '';
    this.editForm.confirmPassword = '';
    
    // Exit edit mode
    this.isEditing = false;
    this.errorMessage = '';
    this.successMessage = '';
  }
}