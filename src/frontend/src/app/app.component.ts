import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';



import { CommonModule } from '@angular/common';
import { SidebarComponent } from './components/sidebar/sidebar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  imports: [RouterOutlet,SidebarComponent,CommonModule]
})
export class AppComponent {
  title = 'frontend';
}
