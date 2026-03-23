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
  imports: [CommonModule, FormsModule],
  templateUrl: './checklist.component.html',
  styleUrls: ['./checklist.component.css']
})
export class ChecklistComponent implements OnInit {
  truckBarcode: string = '';
  tripType: string = '';
  tripNumber: string = '';
  plateNumber: string = '';
  tripDriver: string = '';
  customerName: string = '';
  manualTruckPlate: string = '';
  newTruckPlate: string = '';
  
  checklistItems: ChecklistItem[] = [
    { id: 'chk1', label: 'Surat Jalan', checked: false, required: true },
    { id: 'chk2', label: 'APD', checked: false, required: true },
    { id: 'chk3', label: 'Kendaraan Layak Jalan', checked: false, required: true }
  ];

  constructor(private router: Router, private apiService: ApiService, private authService: AuthService) {}

  ngOnInit() {
    this.loadSavedChecklistData();
    localStorage.removeItem('tripSummary');

    // localStorage.removeItem('checklistData');
    // localStorage.removeItem('tripData');

    this.manualTruckPlate = localStorage.getItem('manualTruckPlate') || '';

    // Lainnya g perlu checklist
    if(this.manualTruckPlate === 'LAINNYA') {
      this.onSubmit();
    }

    this.truckBarcode = localStorage.getItem('currentTruckBarcode') || '';
    this.tripType = localStorage.getItem('tripType') || '';
    this.tripNumber = localStorage.getItem('tripNumber') || '';
    this.customerName = localStorage.getItem('customerName') || '';
    this.newTruckPlate = localStorage.getItem('newTruckPlate') || '';

    
    // Get plate number from trip data if available
    if (/**this.manualTruckPlate === 'LAINNYA' ||**/ this.manualTruckPlate === 'GROUP/RELASI/VENDOR/EKSPEDISI') {
      this.plateNumber = this.newTruckPlate;
    } else {
      const tripDataString = localStorage.getItem('currentTripData');
      if (tripDataString) {
        try {
          const tripData = JSON.parse(tripDataString);
          this.plateNumber = tripData?.truckPlate;
          this.tripDriver = tripData?.driver || '-';
        } catch (error) {
          this.plateNumber = '';
          this.tripDriver = '-';
        }
      } else {
        this.plateNumber = '';
        this.tripDriver = '-';
      }
    }
    
    if ((this.manualTruckPlate !== 'LAINNYA' && this.manualTruckPlate !== 'GROUP/RELASI/VENDOR/EKSPEDISI' && !this.truckBarcode) || this.tripType !== 'OUT') {
      console.log('manual truck plate' + this.manualTruckPlate)
      console.log('truck barcode' + this.truckBarcode)
      console.log(this.tripType)
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

    let ck1 = false;
    let ck2 = false;

    if (this.manualTruckPlate!=='LAINNYA') {
      if (this.requiredItemsCompleted) {
        // Save checklist data
        localStorage.setItem('checklistData', JSON.stringify(this.checklistItems));

        ck1 = this.checklistItems.find(item => item.id === 'chk1')?.checked || false;
        ck2 = this.checklistItems.find(item => item.id === 'chk2')?.checked || false;
        
        
      } else {
        alert('Semua item checklist wajib harus dicentang sebelum melanjutkan.');
        return;
      }
    }

    // Prepare data for API
      const tripData: TripData = {
        odometer: 0, // Will be filled in odometer component
        type: this.tripType, // 'OUT' or 'IN'
        chk1: ck1,
        chk2: ck2,
        tripNum: localStorage.getItem('tripNumber') || '',
        note: '', // Will be filled in odometer component
        tripDriver: localStorage.getItem('tripDriver') || ''
      };
      
      // Save trip data for later use in odometer component
      localStorage.setItem('tripData', JSON.stringify(tripData));
      
      this.router.navigate(['/odometer']);
  }

  goBack() {
    this.router.navigate(['/scan-barcode']);
  }

  logout() {
    this.authService.logout();
  }

  loadSavedChecklistData() {
    const savedData = localStorage.getItem('checklistData');
    if (savedData) {
      try {
        const savedItems = JSON.parse(savedData);
        savedItems.forEach((savedItem: ChecklistItem) => {
          const item = this.checklistItems.find(i => i.id === savedItem.id);
          if (item) {
            item.checked = savedItem.checked;
          }
        });
      } catch (error) {
        console.error('Error loading checklist data:', error);
      }
    }
  }

  onChecklistChange() {
    localStorage.setItem('checklistData', JSON.stringify(this.checklistItems));
  }
}
