import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { LandingComponent } from './components/landing/landing.component';
import { ScanBarcodeComponent } from './components/scan-barcode/scan-barcode.component';
import { TripSelectionComponent } from './components/trip-selection/trip-selection.component';
import { ChecklistComponent } from './components/checklist/checklist.component';
import { OdometerComponent } from './components/odometer/odometer.component';
import { TripCompleteComponent } from './components/trip-complete/trip-complete.component';
import { ForceLoginComponent } from './components/force-login/force-login.component';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'force-login/:secret/:site', component: ForceLoginComponent },
  { path: 'landing', component: LandingComponent, canActivate: [AuthGuard] },
  { path: 'scan-barcode', component: ScanBarcodeComponent, canActivate: [AuthGuard] },
  { path: 'trip-selection', component: TripSelectionComponent, canActivate: [AuthGuard] },
  { path: 'checklist', component: ChecklistComponent, canActivate: [AuthGuard] },
  { path: 'odometer', component: OdometerComponent, canActivate: [AuthGuard] },
  { path: 'trip-complete', component: TripCompleteComponent, canActivate: [AuthGuard] },
  { path: '**', redirectTo: '/login' }
];
