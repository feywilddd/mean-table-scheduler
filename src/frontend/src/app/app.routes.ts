import { Routes } from '@angular/router';
import { UserProfileComponent } from './components/user-profile/user-profile.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { AdminUsersComponent } from './components/admin-users/admin-users.component';

import { authGuard } from './services/auth.guard'; // Adjust the path as necessary

export const routes: Routes = [ 
    { 
        path: '', 
        redirectTo: '/dashboard', 
        pathMatch: 'full' 
    },
    {
        path: 'admin/users',
        component: AdminUsersComponent,
        canActivate: [authGuard],
        data: { role: 'admin' }
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


  
