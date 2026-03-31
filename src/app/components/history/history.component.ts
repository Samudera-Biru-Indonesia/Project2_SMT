import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.css']
})
export class HistoryComponent implements OnInit, OnDestroy {

  constructor(
    private authService: AuthService,
    private http: HttpClient,
    private router: Router
  ) {}

  // Filter properties
  startDate: string = '';
  endDate: string = '';
  selectedTripTypes: string[] = [];
  selectedStatuses: string[] = [];
  showAdvancedFilters: boolean = false;
  showTripTypeDropdown: boolean = false;
  showStatusDropdown: boolean = false;
  siteCode: string = localStorage.getItem('currentPlant') || '';
  
  // Advanced filter properties
  tripNum: string = '';
  plateNumber: string = '';
  driver: string = '';
  coDriver: string = '';
  
  // Dropdown data
  tripTypes = ['IN', 'OUT'];
  statuses = ['VALID', 'CANCELLED'];
  
  filteredData: any[] = [];
  reportData: any[] = [];

  ngOnInit(): void {
    // Set default date filter to last 3 days
    const today = new Date();
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(today.getDate() - 3);
    
    this.startDate = threeDaysAgo.toISOString().split('T')[0];
    this.endDate = today.toISOString().split('T')[0];
    
    this.loadReportData();
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', this.closeDropdowns.bind(this));
  }

  loadReportData(): void {
    const basicAuth = btoa(`${environment.api.basicAuth.username}:${environment.api.basicAuth.password}`);
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Basic ${basicAuth}`,
      'x-api-key': environment.api.apiKey
    });
    
    const empCode = localStorage.getItem('employeeCode') || '';
    const siteCode = localStorage.getItem('currentPlant') || '';
    
    const payload: any = {
      EmpCode: empCode,
      sites: siteCode,
      startDate: this.startDate || '',
      endDate: this.endDate || ''
    };
    
    this.http.post<any>('https://epicprodapp.samator.com/KineticPilot/api/v2/efx/SGI/SMTTruckCheckApp/getReport', payload, { headers })
      .subscribe({
        next: (response) => {
          const rawData = response.DataSet?.TruckCheck || [];
          this.reportData = rawData.map((item: any) => ({
            empCode: item.EmpCode || '',
            empName: item.EmpName || '',
            date: item.TripDate ? item.TripDate.split('T')[0] : '',
            time: item.TripTime || '',
            tripNum: item.TripNum || '',
            plateNumber: item.PlateNum || '',
            odometer: item.OdometerReading || 0,
            siteCode: item.SiteCode || '',
            siteName: item.SiteName || '',
            cargoQty: item.CargoQty || 0,
            tripType: item.TripType || '',
            notes: item.Notes || '',
            driver: item.Driver || '',
            coDriver: item.CoDriver || '',
            status: item.Status || '',
            truckCategory: item.TruckCategory || ''
          }));
          
          this.applyFilters();
        },
        error: (err) => {
          console.error('Error loading report data:', err);
          this.reportData = [];
          this.filteredData = [];
        }
      });
  }



  applyFilters(): void {
    this.filteredData = this.reportData.filter(trip => {
      const typeMatch = this.selectedTripTypes.length === 0 || this.selectedTripTypes.includes(trip.tripType);
      const statusMatch = this.selectedStatuses.length === 0 || this.selectedStatuses.includes(trip.status);
      const advTripNumMatch = !this.tripNum || trip.tripNum.toLowerCase().includes(this.tripNum.toLowerCase());
      const advPlateMatch = !this.plateNumber || trip.plateNumber.toLowerCase().includes(this.plateNumber.toLowerCase());
      const advDriverMatch = !this.driver || trip.driver.toLowerCase().includes(this.driver.toLowerCase());
      const advCoDriverMatch = !this.coDriver || trip.coDriver.toLowerCase().includes(this.coDriver.toLowerCase());
      
      return typeMatch && statusMatch && advTripNumMatch && advPlateMatch && advDriverMatch && advCoDriverMatch;
    });
  }

  toggleAdvancedFilters(): void {
    this.showAdvancedFilters = !this.showAdvancedFilters;
    if (!this.showAdvancedFilters) {
      this.tripNum = '';
      this.plateNumber = '';
      this.driver = '';
      this.coDriver = '';
      this.applyFilters();
    }
  }

  toggleTripTypeSelection(tripType: string): void {
    const index = this.selectedTripTypes.indexOf(tripType);
    if (index > -1) {
      this.selectedTripTypes.splice(index, 1);
    } else {
      this.selectedTripTypes.push(tripType);
    }
    this.applyFilters();
  }

  toggleSelectAllTripTypes(): void {
    if (this.selectedTripTypes.length === this.tripTypes.length) {
      this.selectedTripTypes = [];
    } else {
      this.selectedTripTypes = [...this.tripTypes];
    }
    this.applyFilters();
  }



  toggleStatusSelection(status: string): void {
    const index = this.selectedStatuses.indexOf(status);
    if (index > -1) {
      this.selectedStatuses.splice(index, 1);
    } else {
      this.selectedStatuses.push(status);
    }
    this.applyFilters();
  }

  toggleSelectAllStatuses(): void {
    if (this.selectedStatuses.length === this.statuses.length) {
      this.selectedStatuses = [];
    } else {
      this.selectedStatuses = [...this.statuses];
    }
    this.applyFilters();
  }



  closeOtherDropdowns(except: string): void {
    if (except !== 'tripType') this.showTripTypeDropdown = false;
    if (except !== 'status') this.showStatusDropdown = false;
  }

  closeDropdowns(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.multiselect-wrapper')) {
      this.showTripTypeDropdown = false;
      this.showStatusDropdown = false;
    }
  }

  clearFilters(): void {
    const today = new Date();
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(today.getDate() - 3);
    
    this.startDate = threeDaysAgo.toISOString().split('T')[0];
    this.endDate = today.toISOString().split('T')[0];
    this.selectedTripTypes = [];
    this.selectedStatuses = [];
    this.tripNum = '';
    this.plateNumber = '';
    this.driver = '';
    this.coDriver = '';
    this.loadReportData();
  }

  goBack(): void {
    this.router.navigate(['/trip-selection']);
  }

  viewPhotos(trip: any): void {
    // TODO: Implement photo viewing logic
    console.log('View photos for trip:', trip);
  }

  toggleStatus(trip: any): void {
    // TODO: Implement backend logic to update status
    // For now, just toggle the status locally
    if (trip.status.toLowerCase() === 'valid') {
      trip.status = 'CANCELLED';
    } else {
      trip.status = 'VALID';
    }
    console.log('Status toggled for trip:', trip);
  }

  ngOnDestroy(): void {
    document.removeEventListener('click', this.closeDropdowns.bind(this));
  }
}
