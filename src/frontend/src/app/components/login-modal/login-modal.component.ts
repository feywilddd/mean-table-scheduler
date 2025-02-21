import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login-modal.component.html',
  styleUrl: './login-modal.component.css'
})
export class LoginModalComponent {
  username = '';
  password = '';
  @Output() close = new EventEmitter<void>();

  closeModal() {
    this.close.emit();
  }

  onSubmit(event: Event) {
    event.preventDefault();
    // Handle login logic here
    console.log('Login attempt:', { username: this.username, password: this.password });
  }
}
