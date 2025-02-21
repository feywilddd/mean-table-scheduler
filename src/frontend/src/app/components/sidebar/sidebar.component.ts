import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LoginModalComponent } from '../login-modal/login-modal.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink,LoginModalComponent,CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  showModal = false;
}
