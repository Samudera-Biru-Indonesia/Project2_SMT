import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, TripData } from '../../services/api.service';

@Component({
  selector: 'app-odometer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './odometer.component.html',
  styleUrls: ['./odometer.component.css']
})
export class OdometerComponent implements OnInit {
  truckBarcode: string = '';
  tripType: string = '';
  odometerReading: string = '';
  driverName: string = '';
  notes: string = '';

  constructor(private router: Router, private apiService: ApiService) {}

  ngOnInit() {
    this.truckBarcode = localStorage.getItem('currentTruckBarcode') || '';
    this.tripType = localStorage.getItem('tripType') || '';
    
    if (!this.truckBarcode || !this.tripType) {
      this.router.navigate(['/trip-selection']);
    }
  }

  onSubmit() {
    if (this.odometerReading && this.driverName) {
      // Get trip data from localStorage (set by checklist component for OUT trips)
      const savedTripData = localStorage.getItem('tripData');
      
      let tripData: TripData;
      
      if (savedTripData && this.tripType === 'OUT') {
        // For OUT trips, use data from checklist
        tripData = JSON.parse(savedTripData);
        tripData.odometer = parseFloat(this.odometerReading);
      } else {
        // For IN trips or if no saved data, create new trip data
        tripData = {
          odometer: parseFloat(this.odometerReading),
          type: this.tripType,
          chk1: false, // For IN trips, all checks are false
          chk2: false,
          chk3: false,
          chk4: false,
          chk5: false,
          tripNum: localStorage.getItem('tripNumber') || ''
        };
      }
      
      // Send data to API
      this.sendTripDataToAPI(tripData);
      
      // Save trip data locally as well
      const localTripData = {
        truckBarcode: this.truckBarcode,
        tripType: this.tripType,
        odometerReading: this.odometerReading,
        driverName: this.driverName,
        notes: this.notes,
        timestamp: new Date().toISOString(),
        checklistData: this.tripType === 'OUT' ? localStorage.getItem('checklistData') : null
      };
      
      // Save to localStorage (in real app, would send to server)
      const existingTrips = JSON.parse(localStorage.getItem('trips') || '[]');
      existingTrips.push(localTripData);
      localStorage.setItem('trips', JSON.stringify(existingTrips));
      
      // Clean up temporary data
      localStorage.removeItem('currentTruckBarcode');
      localStorage.removeItem('tripType');
      localStorage.removeItem('checklistData');
      localStorage.removeItem('tripData');
      localStorage.removeItem('tripNumber');
      
      this.router.navigate(['/trip-complete']);
    } else {
      alert('Silakan isi semua field yang wajib');
    }
  }

  // Function to send data to API
  sendTripDataToAPI(tripData: TripData) {
    this.apiService.sendTripData(tripData).subscribe({
      next: (response) => {
        console.log('API Response:', response);
        
        // Check if response is empty object {} (success) or has content (error)
        if (response && Object.keys(response).length === 0) {
          // Empty object {} means success
          console.log('Trip data submission successful!');
          console.log('Data sent to server:', tripData);
        } else if (response && Object.keys(response).length > 0) {
          // Response has content, likely an error
          console.error('❌ API returned error:', response);
          alert('Error: ' + JSON.stringify(response));
        } else {
          // No response or null
          console.log('Trip data submission successful! (no response body)');
          console.log('Data sent to server:', tripData);
        }
      },
      error: (error) => {
        console.error('❌ Error sending trip data:', error);
        
        let errorMessage = 'Gagal mengirim data ke server.';
        
        if (error.status === 0) {
          errorMessage += ' Periksa koneksi internet Anda.';
        } else if (error.status === 401) {
          errorMessage += ' Authentication gagal.';
        } else if (error.status === 403) {
          errorMessage += ' Akses ditolak.';
        } else if (error.status === 404) {
          errorMessage += ' API endpoint tidak ditemukan.';
        } else if (error.status >= 500) {
          errorMessage += ' Server error.';
        } else {
          errorMessage += ` (HTTP ${error.status})`;
        }
        
        alert(errorMessage + '\n\nData tetap tersimpan secara lokal.');
      }
    });
  }

  goBack() {
    if (this.tripType === 'OUT') {
      this.router.navigate(['/checklist']);
    } else {
      this.router.navigate(['/trip-selection']);
    }
  }
}
