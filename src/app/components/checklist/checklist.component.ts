import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, TripData } from '../../services/api.service';

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
  
  checklistItems: ChecklistItem[] = [
    { id: 'chk1', label: 'Engine Oil Level', checked: false, required: true },
    { id: 'chk2', label: 'Tire Condition', checked: false, required: true },
    { id: 'chk3', label: 'Brake System', checked: false, required: true },
    { id: 'chk4', label: 'Lights (Headlights, Taillights)', checked: false, required: true },
    { id: 'chk5', label: 'Side Mirrors', checked: false, required: true }
  ];

  constructor(private router: Router, private apiService: ApiService) {}

  ngOnInit() {
    this.truckBarcode = localStorage.getItem('currentTruckBarcode') || '';
    this.tripType = localStorage.getItem('tripType') || '';
    
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
        chk3: this.checklistItems.find(item => item.id === 'chk3')?.checked || false,
        chk4: this.checklistItems.find(item => item.id === 'chk4')?.checked || false,
        chk5: this.checklistItems.find(item => item.id === 'chk5')?.checked || false,
        tripNum: localStorage.getItem('tripNumber') || '',
        note: '' // Will be filled in odometer component
      };
      
      // Save trip data for later use in odometer component
      localStorage.setItem('tripData', JSON.stringify(tripData));
      
      this.router.navigate(['/odometer']);
    } else {
      alert('Silakan lengkapi semua item checklist yang wajib sebelum melanjutkan.');
    }
  }

  goBack() {
    this.router.navigate(['/trip-selection']);
  }
}
