import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TripInfo } from '../../services/api.service';

@Component({
  selector: 'app-trip-selection',
  standalone: true,
  imports: [CommonModule],
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

    // Generate trip number if not exists
    this.tripNumber = localStorage.getItem('tripNumber') || this.generateTripNumber();
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

  generateTripNumber(): string {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    
    return `${this.truckBarcode}-${year}${month}${day}${hours}${minutes}${seconds}`;
  }

  selectTripType(type: 'IN' | 'OUT') {
    localStorage.setItem('tripType', type);
    
    // Trip number already generated in ngOnInit
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
