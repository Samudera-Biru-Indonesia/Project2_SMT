import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TripInfo } from '../../services/api.service';
import { EnvironmentIndicatorComponent } from '../environment-indicator/environment-indicator.component';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-trip-selection',
  standalone: true,
  imports: [CommonModule, EnvironmentIndicatorComponent],
  templateUrl: './trip-selection.component.html',
  styleUrls: ['./trip-selection.component.css']
})
export class TripSelectionComponent implements OnInit {
  // truckBarcode: string = '';
  tripData: TripInfo | null = null;
  hasTripData: boolean = false;
  tripNumber: string = '';
  plateNumber: string = '';

  constructor(private router: Router, private authService: AuthService) {}

  ngOnInit() {
    // this.truckBarcode = localStorage.getItem('currentTruckBarcode') || '';
    localStorage.removeItem('tripType'); // supaya g ngebug waktu bolak balik halaman. better setiap kali masuk ke halaman ini jadi ke-reset aja.

    // if (!this.truckBarcode) {
    //   this.router.navigate(['/scan-barcode']);
    //   return;
    // }

    // Use the truck barcode as trip number (surat jalan) instead of generating new one
    // this.tripNumber = this.truckBarcode;
    // localStorage.setItem('tripNumber', this.tripNumber);

    // Check if we have trip data from API
    const tripDataString = localStorage.getItem('currentTripData');
    if (tripDataString) {
      try {
        this.tripData = JSON.parse(tripDataString);
        this.hasTripData = true;
        this.plateNumber = this.tripData?.truckPlate || 'N/A';
      } catch (error) {
        this.hasTripData = false;
        this.plateNumber = 'N/A';
      }
    } else {
      this.hasTripData = false;
      this.plateNumber = 'N/A';
    }
  }

  selectTripType(type: 'IN' | 'OUT') {
    localStorage.setItem('tripType', type);
    
    // Trip number already set in ngOnInit (using truck barcode)
    localStorage.setItem('tripNumber', this.tripNumber);
    
    this.router.navigate(['/scan-barcode']);
  }

  // goBack() {
  //   this.router.navigate(['/landing']);
  // }

  logout() {
    this.authService.logout();
  }
}
