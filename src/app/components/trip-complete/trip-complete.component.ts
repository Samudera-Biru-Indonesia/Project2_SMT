import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-trip-complete',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './trip-complete.component.html',
  styleUrls: ['./trip-complete.component.css']
})
export class TripCompleteComponent implements OnInit {
  tripNumber: string | null = null;
  plateNumber: string = '';
  truckBarcode: string = '';
  tripType: string = '';
  tripDriver: string | null = null;
  jumlahMuatan: number | null = null;
  odometer: number | null = null;
  fullName: string = '';
  empCode: string = '';
  customerName: string | null = null;
  notes: string | null = null;
  photoTimestamp: string | null = null;
  showOverlay: boolean = true;
  showShareModal: boolean = false;
  summaryCanvas: HTMLCanvasElement | null = null;
  
  constructor(private router: Router, private authService: AuthService) {}

  ngOnInit() {
    const summaryDataString = localStorage.getItem('tripSummary');
    if (summaryDataString) {
      try {
        const summaryData = JSON.parse(summaryDataString);
        this.tripNumber = summaryData.tripNumber !== undefined ? summaryData.tripNumber : null;
        this.tripDriver = summaryData.tripDriver !== undefined ? summaryData.tripDriver : null;
        this.jumlahMuatan = summaryData.jumlahMuatan !== undefined ? summaryData.jumlahMuatan : null;
        this.odometer = summaryData.odometer !== undefined ? summaryData.odometer : null;
        this.fullName = summaryData.fullName || 'N/A';
        this.empCode = summaryData.empCode || 'N/A';
        this.tripType = summaryData.tripType || 'N/A';
        this.plateNumber = summaryData.plateNumber || 'N/A';
        this.customerName = summaryData.customerName !== undefined ? summaryData.customerName : null;
        this.notes = summaryData.notes !== undefined ? summaryData.notes : null;
        this.photoTimestamp = summaryData.photoTimestamp || this.generateCurrentTimestamp();
      } catch (error) {
        this.tripNumber = 'N/A';
      }
    }

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
    localStorage.removeItem('photoTimestamp');
    // localStorage.removeItem('trips');
    // localStorage.removeItem('odometerData');

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
    localStorage.removeItem('photoTimestamp');
    
    this.router.navigate(['/trip-selection']);
  }

  generateCurrentTimestamp(): string {
    const now = new Date();
    
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed (Jan = 0)
    const yyyy = now.getFullYear();
    
    const hh = String(now.getHours()).padStart(2, '0'); // getHours() is naturally 24-hour
    const min = String(now.getMinutes()).padStart(2, '0');
    
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
  }

  logout() {
    this.authService.logout();
  }

  openShareModal() {
    const summaryElement = document.querySelector('.trip-summary-info') as HTMLElement;
    if (summaryElement) {
      html2canvas(summaryElement).then((canvas: HTMLCanvasElement) => {
        this.summaryCanvas = canvas;
        this.showShareModal = true;
      });
    }
  }

  closeShareModal() {
    this.showShareModal = false;
  }

  downloadSummary() {
    if (this.summaryCanvas) {
      const link = document.createElement('a');
      link.download = 'ringkasan-perjalanan.png';
      link.href = this.summaryCanvas.toDataURL();
      link.click();
    }
    this.closeShareModal();
  }

  shareToWhatsApp() {
    if (this.summaryCanvas) {
      this.summaryCanvas.toBlob((blob) => {
        if (blob && navigator.share) {
          const file = new File([blob], 'ringkasan-perjalanan.png', { type: 'image/png' });
          navigator.share({
            files: [file],
            title: 'Ringkasan Perjalanan',
            text: 'Ringkasan perjalanan truck'
          }).catch(console.error);
        } else if (this.summaryCanvas) {
          // Fallback: download the image
          const link = document.createElement('a');
          link.download = 'ringkasan-perjalanan.png';
          link.href = this.summaryCanvas.toDataURL();
          link.click();
        }
      });
    }
    this.closeShareModal();
  }
}
