import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModifyBookingModalComponent } from './modify-booking-modal.component';

describe('ModifyBookingModalComponent', () => {
  let component: ModifyBookingModalComponent;
  let fixture: ComponentFixture<ModifyBookingModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModifyBookingModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModifyBookingModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
