import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalendarSpotComponent } from './calendar-spot.component';

describe('CalendarSpotComponent', () => {
  let component: CalendarSpotComponent;
  let fixture: ComponentFixture<CalendarSpotComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalendarSpotComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CalendarSpotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
