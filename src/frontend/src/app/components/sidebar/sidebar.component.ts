import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { InscriptionModalComponent } from '../inscription-modal/inscription-modal.component';
import { LoginModalComponent } from '../login-modal/login-modal.component';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule, InscriptionModalComponent, LoginModalComponent],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  showRegisterModal = false;
  showLoginModal = false;
 
  username: string = '';
  password: string = '';
  isLoading: boolean = false;
  errorMessage: string = '';
 
  authService = inject(AuthService);
  private router = inject(Router);
 
  openRegisterModal() {
    this.showRegisterModal = true;
    this.showLoginModal = false;
  }
 
  openLoginModal() {
    this.showLoginModal = true;
    this.showRegisterModal = false;
  }
 
  closeModals() {
    this.showRegisterModal = false;
    this.showLoginModal = false;
  }
 
  onLogin(event: Event) {
    event.preventDefault();
   
    // Reset error message
    this.errorMessage = '';
   
    // Validate form
    if (!this.username || !this.password) {
      this.errorMessage = 'Veuillez remplir tous les champs';
      return;
    }
   
    // Set loading state
    this.isLoading = true;
   
    // Call auth service to login user
    this.authService.login(this.username, this.password).subscribe({
      next: (response) => {
        console.log('Login successful', response);
        this.isLoading = false;
       
        // Reset form
        this.username = '';
        this.password = '';
      },
      error: (error) => {
        console.error('Login error', error);
        this.isLoading = false;
        this.errorMessage = 'Email ou mot de passe incorrect';
      }
    });
  }
 
  logout() {
    this.authService.logout();
  }

  navigateToUserSection() {
    if (this.authService.hasRole('admin')) {
      // Admin goes to user management
      this.router.navigate(['/admin/users']);
    } else {
      // Regular user goes to their profile
      this.router.navigate(['/users/me']);
    }
  }

  navigateToTablesSection(): void {
    this.router.navigate(['/admin/tables']);
  }
}