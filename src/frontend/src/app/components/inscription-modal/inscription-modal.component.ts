// Add this to inscription-modal.component.ts (update your existing component)
import { Component, Output, EventEmitter, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-inscription-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './inscription-modal.component.html',
  styleUrl: './inscription-modal.component.css'
})
export class InscriptionModalComponent {
  @Output() close = new EventEmitter<void>();
  @Output() switchToLoginModal = new EventEmitter<void>();
  @Input() embedMode: boolean = false;  // Add this input property
 
  registerForm: FormGroup;
  isLoading: boolean = false;
  errorMessage: string = '';
  submitted = false;
 
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  constructor() {
    this.registerForm = this.fb.group({
      name: ['', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(50)
      ]],
      email: ['', [
        Validators.required,
        Validators.email,
        Validators.pattern('^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$')
      ]],
      password: ['', [
        Validators.required,
        Validators.minLength(6)
      ]],
      confirmPassword: ['', [
        Validators.required
      ]]
    }, {
      validators: this.passwordMatchValidator
    });
  }
 
 
  // Custom validator for password matching
  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;
   
    if (password !== confirmPassword) {
      control.get('confirmPassword')?.setErrors({ mismatch: true });
      return { mismatch: true };
    }
   
    return null;
  }
 
  // Getter methods for easy access to form controls
  get f(): any {
    return this.registerForm.controls;
  }
 
  closeModal() {
    this.close.emit();
  }
 
  switchToLogin() {
    this.switchToLoginModal.emit();
  }
 
  onSubmit(event: Event) {
    event.preventDefault();
   
    // Mark all fields as touched to trigger validation display
    this.submitted = true;
    this.registerForm.markAllAsTouched();
   
    // Reset error message
    this.errorMessage = '';
   
    // Check form validity
    if (this.registerForm.invalid) {
      return;
    }
   
    // Set loading state
    this.isLoading = true;
   
    // Call auth service to register user
    this.authService.register({
      name: this.registerForm.value.name,
      email: this.registerForm.value.email,
      password: this.registerForm.value.password
    }).subscribe({
      next: (response) => {
        console.log('Registration successful', response);
        this.isLoading = false;
        this.closeModal();
        this.switchToLogin();
      },
      error: (error) => {
        console.error('Registration error', error);
        this.isLoading = false;
        // Always use fallback message for consistent experience
        this.errorMessage = 'Une erreur est survenue lors de l\'inscription';
      }
    });
  }
}