import { Routes } from '@angular/router';
import { UserProfileComponent } from './components/user-profile/user-profile.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';

import { authGuard } from './services/auth.guard'; // Adjust the path as necessary

export const routes: Routes = [ 
    { 
        path: '', 
        redirectTo: '/dashboard', 
        pathMatch: 'full' 
    },
    {
        path: 'users/me',
        component: UserProfileComponent,
        canActivate: [authGuard] // Assuming you have an auth guard
    },
    {
        path: 'dashboard',
        component: DashboardComponent
    },
    { 
        path: '**', 
        redirectTo: '/dashboard' 
    }
];


  
