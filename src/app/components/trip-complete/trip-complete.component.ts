import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-trip-complete',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './trip-complete.component.html',
  styleUrls: ['./trip-complete.component.css']
})
export class TripCompleteComponent implements OnInit {
  tripNumber: string = '';
  plateNumber: string = '';
  truckBarcode: string = '';
  tripType: string = '';
  
  constructor(private router: Router) {}

  ngOnInit() {
    this.tripNumber = localStorage.getItem('tripNumber') || 'N/A';
    this.truckBarcode = localStorage.getItem('currentTruckBarcode') || 'N/A';
    this.tripType = localStorage.getItem('tripType') || 'N/A';
    
    // Get plate number from trip data if available
    const tripDataString = localStorage.getItem('currentTripData');
    if (tripDataString) {
      try {
        const tripData = JSON.parse(tripDataString);
        this.plateNumber = tripData?.truckPlate || 'N/A';
      } catch (error) {
        console.error('Error parsing trip data:', error);
        this.plateNumber = 'N/A';
      }
    } else {
      this.plateNumber = 'N/A';
    }
  }

  startNewTrip() {
    // Clear trip-related data
    localStorage.removeItem('tripNumber');
    localStorage.removeItem('tripType');
    localStorage.removeItem('currentTruckBarcode');
    localStorage.removeItem('currentTripData');
    localStorage.removeItem('tripData');
    
    this.router.navigate(['/trip-selection']);
  }

  // goToLanding() {
  //   this.router.navigate(['/trip-selection']);
  // }
}
