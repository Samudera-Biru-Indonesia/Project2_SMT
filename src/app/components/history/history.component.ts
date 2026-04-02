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
  selectedEmployees: string[] = [];
  selectedStatuses: string[] = [];
  showAdvancedFilters: boolean = false;
  showTripTypeDropdown: boolean = false;
  showEmployeeDropdown: boolean = false;
  showStatusDropdown: boolean = false;
  siteCode: string = localStorage.getItem('currentPlant') || '';
  
  // Search terms for multiselect
  employeeSearchTerm: string = '';
  
  // Advanced filter properties
  tripNum: string = '';
  plateNumber: string = '';
  driver: string = '';
  coDriver: string = '';
  
  // Dropdown data
  employees: any[] = [];
  tripTypes = ['IN', 'OUT'];
  statuses = [
    { value: 'VALID', label: 'TIDAK BATAL' },
    { value: 'CANCELLED', label: 'BATAL' }
  ];
  
  filteredData: any[] = [];
  reportData: any[] = [];
  isLoading: boolean = false;
  
  // Pagination
  currentPage: number = 1;
  itemsPerPage: number = 12;
  totalPages: number = 0;

  get paginatedData(): any[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.filteredData.slice(startIndex, endIndex);
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  ngOnInit(): void {
    // Set default date filter to last 3 days
    const today = new Date();
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(today.getDate() - 3);
    
    this.startDate = threeDaysAgo.toISOString().split('T')[0];
    this.endDate = today.toISOString().split('T')[0];
    
    this.loadEmployees();
    this.loadReportData();
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', this.closeDropdowns.bind(this));
  }

  loadReportData(): void {
    this.isLoading = true;
    const basicAuth = btoa(`${environment.api.basicAuth.username}:${environment.api.basicAuth.password}`);
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Basic ${basicAuth}`,
      'x-api-key': environment.api.apiKey
    });
    
    const payload: any = {
      sites: this.siteCode || '',
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
            notesExpanded: false,
            driver: item.Driver || '',
            coDriver: item.CoDriver || '',
            status: item.Status || '',
            truckCategory: item.TruckCategory || ''
          }));
          
          this.applyFilters();
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error loading report data:', err);
          this.reportData = [];
          this.filteredData = [];
          this.isLoading = false;
        }
      });
  }

  loadEmployees(): void {
    const basicAuth = btoa(`${environment.api.basicAuth.username}:${environment.api.basicAuth.password}`);
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Basic ${basicAuth}`,
      'x-api-key': environment.api.apiKey
    });
    
    this.http.post<any>('https://epicprodapp.samator.com/KineticPilot/api/v2/efx/SGI/SMTTruckCheckApp/getAllSatpam', {}, { headers })
      .subscribe({
        next: (response) => {
          const employeesData = response.DataSet?.Employees || [];
          this.employees = employeesData
            .filter((emp: any) => emp.EmpCode && emp.EmpName)
            .map((emp: any) => ({
              EmpCode: emp.EmpCode,
              EmpName: emp.EmpName,
              Site: emp.Site || ''
            }));
        },
        error: (err) => console.error('Error loading employees:', err)
      });
  }

  applyFilters(): void {
    this.filteredData = this.reportData.filter(trip => {
      const typeMatch = this.selectedTripTypes.length === 0 || this.selectedTripTypes.includes(trip.tripType);
      const empMatch = this.selectedEmployees.length === 0 || this.selectedEmployees.includes(trip.empCode);
      const statusMatch = this.selectedStatuses.length === 0 || this.selectedStatuses.includes(trip.status);
      const advTripNumMatch = !this.tripNum || trip.tripNum.toLowerCase().includes(this.tripNum.toLowerCase());
      const advPlateMatch = !this.plateNumber || trip.plateNumber.toLowerCase().includes(this.plateNumber.toLowerCase());
      const advDriverMatch = !this.driver || trip.driver.toLowerCase().includes(this.driver.toLowerCase());
      const advCoDriverMatch = !this.coDriver || trip.coDriver.toLowerCase().includes(this.coDriver.toLowerCase());
      
      return typeMatch && empMatch && statusMatch && advTripNumMatch && advPlateMatch && advDriverMatch && advCoDriverMatch;
    });
    
    // Update pagination
    this.totalPages = Math.ceil(this.filteredData.length / this.itemsPerPage);
    this.currentPage = 1; // Reset to first page when filters change
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

  toggleEmployeeSelection(empKey: string): void {
    const index = this.selectedEmployees.indexOf(empKey);
    if (index > -1) {
      this.selectedEmployees.splice(index, 1);
    } else {
      this.selectedEmployees.push(empKey);
    }
    this.applyFilters();
  }

  toggleSelectAllEmployees(): void {
    const filteredEmployees = this.getFilteredEmployees();
    if (this.selectedEmployees.length === filteredEmployees.length) {
      this.selectedEmployees = [];
    } else {
      this.selectedEmployees = filteredEmployees.map(emp => emp.EmpCode);
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
      this.selectedStatuses = this.statuses.map(s => s.value);
    }
    this.applyFilters();
  }

  getStatusLabel(value: string): string {
    const status = this.statuses.find(s => s.value === value);
    return status ? status.label : value;
  }

  getFilteredEmployees(): any[] {
    let filteredBySearch = this.employees;
    
    if (this.employeeSearchTerm) {
      const term = this.employeeSearchTerm.toLowerCase();
      filteredBySearch = this.employees.filter(emp => 
        emp.EmpCode.toLowerCase().includes(term) || 
        emp.EmpName.toLowerCase().includes(term)
      );
    }
    
    if (this.siteCode) {
      filteredBySearch = filteredBySearch.filter(emp => 
        emp.Site === this.siteCode
      );
    }
    
    const uniqueMap = new Map();
    filteredBySearch.forEach((emp: any) => {
      if (!uniqueMap.has(emp.EmpCode)) {
        uniqueMap.set(emp.EmpCode, emp);
      }
    });
    
    return Array.from(uniqueMap.values());
  }

  getSelectedEmployeeName(): string {
    if (this.selectedEmployees.length === 1) {
      const emp = this.employees.find(e => e.EmpCode === this.selectedEmployees[0]);
      return emp ? `${emp.EmpCode} - ${emp.EmpName}` : this.selectedEmployees[0];
    }
    return '';
  }

  closeOtherDropdowns(except: string): void {
    if (except !== 'tripType') this.showTripTypeDropdown = false;
    if (except !== 'employee') this.showEmployeeDropdown = false;
    if (except !== 'status') this.showStatusDropdown = false;
  }

  closeDropdowns(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.multiselect-wrapper')) {
      this.showTripTypeDropdown = false;
      this.showEmployeeDropdown = false;
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
    this.selectedEmployees = [];
    this.selectedStatuses = [];
    this.tripNum = '';
    this.plateNumber = '';
    this.driver = '';
    this.coDriver = '';
    this.employeeSearchTerm = '';
    this.loadReportData();
  }

  goBack(): void {
    this.router.navigate(['/trip-selection']);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.scrollToTop();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.scrollToTop();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.scrollToTop();
    }
  }

  private scrollToTop(): void {
    const historyContent = document.querySelector('.history-content');
    if (historyContent) {
      historyContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
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

  toggleNotes(trip: any): void {
    trip.notesExpanded = !trip.notesExpanded;
  }

  ngOnDestroy(): void {
    document.removeEventListener('click', this.closeDropdowns.bind(this));
  }
}
