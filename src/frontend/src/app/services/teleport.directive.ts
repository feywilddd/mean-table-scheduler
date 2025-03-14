import { Directive, ElementRef, OnInit, OnDestroy } from '@angular/core';

@Directive({
  selector: '[appTeleport]',
  standalone: true
})
export class TeleportDirective implements OnInit, OnDestroy {
  private originalParent: HTMLElement | null = null;
  private element: HTMLElement;

  constructor(private el: ElementRef) {
    this.element = el.nativeElement;
  }

  ngOnInit() {
    this.originalParent = this.element.parentElement;
    const targetContainer = document.getElementById('modal-container');
    
    if (targetContainer && this.element.parentElement) {
      targetContainer.appendChild(this.element);
    }
  }

  ngOnDestroy() {
    if (this.originalParent && this.element.parentElement) {
      try {
        this.originalParent.appendChild(this.element);
      } catch (e) {
        console.warn('Could not restore original element position', e);
      }
    }
  }
}
