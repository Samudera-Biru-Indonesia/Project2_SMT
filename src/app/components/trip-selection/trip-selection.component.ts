import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TripInfo } from '../../services/api.service';
import { EnvironmentIndicatorComponent } from '../environment-indicator/environment-indicator.component';

@Component({
  selector: 'app-trip-selection',
  standalone: true,
  imports: [CommonModule, EnvironmentIndicatorComponent],
  templateUrl: './trip-selection.component.html',
  styleUrls: ['./trip-selection.component.css']
})
export class TripSelectionComponent implements OnInit {
  truckBarcode: string = '';
  tripData: TripInfo | null = null;
  hasTripData: boolean = false;
  tripNumber: string = '';
  plateNumber: string = '';

  constructor(private router: Router) {}

  ngOnInit() {
    this.truckBarcode = localStorage.getItem('currentTruckBarcode') || '';
    if (!this.truckBarcode) {
      this.router.navigate(['/scan-barcode']);
      return;
    }

    // Use the truck barcode as trip number (surat jalan) instead of generating new one
    this.tripNumber = this.truckBarcode;
    localStorage.setItem('tripNumber', this.tripNumber);

    // Check if we have trip data from API
    const tripDataString = localStorage.getItem('currentTripData');
    if (tripDataString) {
      try {
        this.tripData = JSON.parse(tripDataString);
        this.hasTripData = true;
        this.plateNumber = this.tripData?.truckPlate || 'N/A';
        console.log('Trip data loaded:', this.tripData);
      } catch (error) {
        console.error('Error parsing trip data:', error);
        this.hasTripData = false;
        this.plateNumber = 'N/A';
      }
    } else {
      this.hasTripData = false;
      this.plateNumber = 'N/A';
      console.log('No trip data available - manual mode');
    }
  }

  selectTripType(type: 'IN' | 'OUT') {
    localStorage.setItem('tripType', type);
    
    // Trip number already set in ngOnInit (using truck barcode)
    localStorage.setItem('tripNumber', this.tripNumber);
    
    if (type === 'OUT') {
      // For OUT trips, go to checklist first
      this.router.navigate(['/checklist']);
    } else {
      // For IN trips, go directly to odometer
      this.router.navigate(['/odometer']);
    }
  }

  goBack() {
    this.router.navigate(['/scan-barcode']);
  }
}
