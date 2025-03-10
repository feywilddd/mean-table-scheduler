// Add this to login-modal.component.ts
import { Component, Output, EventEmitter, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './login-modal.component.html',
  styleUrl: './login-modal.component.css'
})
export class LoginModalComponent {
  @Output() close = new EventEmitter<void>();
  @Output() switchToRegisterModal = new EventEmitter<void>();
  @Input() embedMode: boolean = false;  // Add this input property
 
  loginForm: FormGroup;
  isLoading: boolean = false;
  errorMessage: string = '';
  submitted = false;
 
  private authService = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [
        Validators.required,
        Validators.email
      ]],
      password: ['', [
        Validators.required
      ]]
    });
  }
 
  // Getter methods for easy access to form controls
  get f(): any {
    return this.loginForm.controls;
  }
 
  closeModal() {
    this.close.emit();
  }
 
  switchToRegister() {
    this.switchToRegisterModal.emit();
  }
 
  onSubmit(event: Event) {
    event.preventDefault();
   
    // Mark all fields as touched to trigger validation display
    this.submitted = true;
   
    // Reset error message
    this.errorMessage = '';
   
    // Check form validity
    if (this.loginForm.invalid) {
      return;
    }
   
    // Set loading state
    this.isLoading = true;
   
    const email = this.loginForm.value.email;
    const password = this.loginForm.value.password;
   
    // Call auth service to login user
    this.authService.login(email, password).subscribe({
      next: (response) => {
        console.log('Login successful', response);
        this.isLoading = false;
       
        // Close modal and redirect
        this.closeModal();
      },
      error: (error) => {
        console.error('Login error', error);
        this.isLoading = false;
       
        // Handle different error response structures
        if (error?.error?.message) {
          // Angular HttpClient wraps the error response in an 'error' property
          this.errorMessage = error.error.message;
        } else if (error?.message) {
          // Direct error message
          this.errorMessage = error.message;
        } else {
          // Fallback error message
          this.errorMessage = 'Email ou mot de passe incorrect';
        }
      }
    });
  }
}