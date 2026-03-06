import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

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
  tripDriver: string = '';
  jumlahMuatan: number = 0;
  odometer: number = 0;
  fullName: string = '';
  empCode: string = '';
  customerName: string = '';
  notes: string | null = null;
  showOverlay: boolean = true;
  
  constructor(private router: Router, private authService: AuthService) {}

  ngOnInit() {
    const summaryDataString = localStorage.getItem('tripSummary');
    if (summaryDataString) {
      try {
        const summaryData = JSON.parse(summaryDataString);
        this.tripNumber = summaryData.tripNumber || 'N/A';
        this.tripDriver = summaryData.tripDriver || 'N/A';
        this.jumlahMuatan = summaryData.jumlahMuatan || 0;
        this.odometer = summaryData.odometer || 0;
        this.fullName = summaryData.fullName || 'N/A';
        this.empCode = summaryData.empCode || 'N/A';
        this.tripType = summaryData.tripType || 'N/A';
        this.plateNumber = summaryData.plateNumber || 'N/A';
        this.customerName = summaryData.customerName || '';
        this.notes = summaryData.notes !== undefined ? summaryData.notes : null;
      } catch (error) {
        this.tripNumber = 'N/A';
      }
    }

    setTimeout(() => {
      this.showOverlay = false;
    }, 2500);
  }

  startNewTrip() {
    // Clear trip-related data
    localStorage.removeItem('tripNumber');
    localStorage.removeItem('tripType');
    localStorage.removeItem('currentTruckBarcode');
    localStorage.removeItem('currentTripData');
    localStorage.removeItem('tripData');
    localStorage.removeItem('tripSummary');
    localStorage.removeItem('customerName');
    localStorage.removeItem('manualTruckPlate');
    localStorage.removeItem('tripDriver');
    localStorage.removeItem('checklistData');
    localStorage.removeItem('newTruckPlate');
    
    this.router.navigate(['/trip-selection']);
  }

  // goToLanding() {
  //   this.router.navigate(['/trip-selection']);
  // }

  logout() {
    this.authService.logout();
  }
}
