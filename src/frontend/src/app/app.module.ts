import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { CalendarSpotComponent } from './components/calendar-spot/calendar-spot.component';
import { CalendarComponent } from './components/calendar/calendar.component';
import { BookingsComponent } from './components/bookings/bookings.component';
import { TablesManagementComponent } from './components/tables-management/tables-management.component';



@NgModule({
  declarations: [
    AppComponent,
    SidebarComponent,
    CalendarSpotComponent,
    CalendarComponent,
    BookingsComponent,
    TablesManagementComponent
    ],
  imports: [
    BrowserModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }