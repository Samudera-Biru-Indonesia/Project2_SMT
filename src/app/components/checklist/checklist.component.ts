import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, TripData } from '../../services/api.service';
import { EnvironmentIndicatorComponent } from '../environment-indicator/environment-indicator.component';
import { AuthService } from '../../services/auth.service';

interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  required: boolean;
}

@Component({
  selector: 'app-checklist',
  standalone: true,
  imports: [CommonModule, FormsModule, EnvironmentIndicatorComponent],
  templateUrl: './checklist.component.html',
  styleUrls: ['./checklist.component.css']
})
export class ChecklistComponent implements OnInit {
  truckBarcode: string = '';
  tripType: string = '';
  tripNumber: string = '';
  plateNumber: string = '';
  tripDriver: string = '';
  
  checklistItems: ChecklistItem[] = [
    { id: 'chk1', label: 'Surat Jalan', checked: false, required: true },
    { id: 'chk2', label: 'APD', checked: false, required: true },
    { id: 'chk3', label: 'Kendaraan Layak Jalan', checked: false, required: true }
  ];

  constructor(private router: Router, private apiService: ApiService, private authService: AuthService) {}

  ngOnInit() {
    this.truckBarcode = localStorage.getItem('currentTruckBarcode') || '';
    this.tripType = localStorage.getItem('tripType') || '';
    this.tripNumber = localStorage.getItem('tripNumber') || '';
    
    // Get plate number from trip data if available
    const tripDataString = localStorage.getItem('currentTripData');
    if (tripDataString) {
      try {
        const tripData = JSON.parse(tripDataString);
        this.plateNumber = tripData?.truckPlate || 'N/A';
        this.tripDriver = tripData?.driver || 'N/A';
      } catch (error) {
        console.error('Error parsing trip data:', error);
        this.plateNumber = 'N/A';
        this.tripDriver = 'N/A';
      }
    } else {
      this.plateNumber = 'N/A';
      this.tripDriver = 'N/A';
    }
    
    if (!this.truckBarcode || this.tripType !== 'OUT') {
      this.router.navigate(['/trip-selection']);
    }
  }

  get requiredItemsCompleted(): boolean {
    const requiredItems = this.checklistItems.filter(item => item.required);
    return requiredItems.every(item => item.checked);
  }

  get completedCount(): number {
    return this.checklistItems.filter(item => item.checked).length;
  }

  get totalCount(): number {
    return this.checklistItems.length;
  }

  onSubmit() {
    if (this.requiredItemsCompleted) {
      // Save checklist data
      localStorage.setItem('checklistData', JSON.stringify(this.checklistItems));
      
      // Prepare data for API
      const tripData: TripData = {
        odometer: 0, // Will be filled in odometer component
        type: this.tripType, // 'OUT' or 'IN'
        chk1: this.checklistItems.find(item => item.id === 'chk1')?.checked || false,
        chk2: this.checklistItems.find(item => item.id === 'chk2')?.checked || false,
        tripNum: localStorage.getItem('tripNumber') || '',
        note: '', // Will be filled in odometer component
        tripDriver: localStorage.getItem('tripDriver') || ''
      };
      
      // Save trip data for later use in odometer component
      localStorage.setItem('tripData', JSON.stringify(tripData));
      
      this.router.navigate(['/odometer']);
    } else {
      alert('Semua item checklist wajib harus dicentang sebelum melanjutkan.');
    }
  }

  goBack() {
    this.router.navigate(['/scan-barcode']);
  }

  logout() {
    this.authService.logout();
  }
}
