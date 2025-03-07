import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TablesManagementComponent } from './tables-management.component';

describe('TablesManagementComponent', () => {
  let component: TablesManagementComponent;
  let fixture: ComponentFixture<TablesManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TablesManagementComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TablesManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
