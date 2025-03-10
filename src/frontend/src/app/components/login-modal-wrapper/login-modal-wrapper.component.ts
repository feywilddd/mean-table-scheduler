import { Component, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { LoginModalComponent } from '../login-modal/login-modal.component';

/**
 * This is a wrapper component that strips away the modal backdrop from the original
 * LoginModalComponent so it can be embedded within another component
 */
@Component({
  selector: 'app-login-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, LoginModalComponent],
  template: `
    <div class="login-form-wrapper">
      <app-login-modal
        [embedMode]="true"
        (close)="close.emit()"
        (switchToRegisterModal)="switchToRegisterModal.emit()">
      </app-login-modal>
    </div>
  `,
  styles: [`
    .login-form-wrapper {
      width: 100%;
    }
  `]
})
export class LoginFormWrapperComponent {
  @Output() close = new EventEmitter<void>();
  @Output() switchToRegisterModal = new EventEmitter<void>();
}