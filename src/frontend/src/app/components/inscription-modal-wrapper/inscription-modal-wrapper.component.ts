import { Component, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { InscriptionModalComponent } from '../inscription-modal/inscription-modal.component';

/**
 * This is a wrapper component that strips away the modal backdrop from the original
 * InscriptionModalComponent so it can be embedded within another component
 */
@Component({
  selector: 'app-inscription-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, InscriptionModalComponent],
  template: `
    <div class="inscription-form-wrapper">
      <app-inscription-modal
        [embedMode]="true"
        (close)="close.emit()"
        (switchToLoginModal)="switchToLoginModal.emit()">
      </app-inscription-modal>
    </div>
  `,
  styles: [`
    .inscription-form-wrapper {
      width: 100%;
    }
  `]
})
export class InscriptionFormWrapperComponent {
  @Output() close = new EventEmitter<void>();
  @Output() switchToLoginModal = new EventEmitter<void>();
}