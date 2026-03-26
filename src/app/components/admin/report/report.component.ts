import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataTablesModule } from 'angular-datatables';
import { Subject } from 'rxjs';
import { Config } from 'datatables.net';
import * as XLSX from 'xlsx';
import { AuthService } from '../../../services/auth.service';
import { ApiService } from '../../../services/api.service';
import { DataTableDirective } from 'angular-datatables';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-report',
  standalone: true,
  imports: [CommonModule, FormsModule, DataTablesModule],
  templateUrl: './report.component.html',
  styleUrls: ['./report.component.css']
})

export class ReportComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild(DataTableDirective, {static: false})
  dtElement!: DataTableDirective;

  constructor(
    private authService: AuthService,
    private apiService: ApiService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  dtOptions: Config = {};
  dtTrigger: Subject<any> = new Subject<any>();
  isDtInitialized = false;
  
  // Filter properties
  startDate: string = '';
  endDate: string = '';
  selectedTripTypes: string[] = [];
  selectedSites: string[] = [];
  selectedEmployees: string[] = [];
  selectedStatuses: string[] = [];
  showAdvancedFilters: boolean = false;
  showTripTypeDropdown: boolean = false;
  showSiteDropdown: boolean = false;
  showEmployeeDropdown: boolean = false;
  showStatusDropdown: boolean = false;
  
  // Search terms for multiselect
  siteSearchTerm: string = '';
  employeeSearchTerm: string = '';
  
  // Advanced filter properties
  tripNum: string = '';
  plateNumber: string = '';
  driver: string = '';
  coDriver: string = '';
  
  // Dropdown data
  sites: any[] = [];
  employees: any[] = [];
  tripTypes = ['IN', 'OUT'];
  statuses = ['VALID', 'CANCELLED'];
  
  filteredData: any[] = [];
  reportData: any[] = [];

  ngOnInit(): void {
    this.dtOptions = {
      pagingType: 'full_numbers',
      pageLength: 5,
      processing: true,
      lengthMenu: [5, 10, 25, 50],
      searching: false,
      ordering: true,
      info: true,
      data: [],
      columns: [
        { title: 'No.', data: null, render: (data: any, type: any, row: any, meta: any) => meta.row + 1 },
        { title: 'Employee No.', data: 'empCode' },
        { title: 'Employee Name', data: 'empName' },
        { title: 'Date & Time', data: null, render: (data: any, type: any, row: any) => row.date + ' ' + row.time },
        { title: 'SJ', data: 'tripNum' },
        { title: 'Nopol', data: 'plateNumber' },
        { title: 'Odometer (KM)', data: 'odometer' },
        { title: 'Site', data: null, render: (data: any, type: any, row: any) => row.siteName + '-' + row.siteCode },
        { title: 'Muatan', data: 'cargoQty' },
        { 
          title: 'Tipe', 
          data: 'tripType', 
          render: (data: any) => {
            console.log('tripType value:', data);
            return `<span class="trip-type ${data ? data.toLowerCase() : ''}">${data || ''}</span>`;
          }
        },
        { title: 'Catatan', data: 'notes' },
        { title: 'Driver', data: 'driver' },
        { title: 'Co-Driver', data: 'coDriver' },
        { 
          title: 'Status', 
          data: 'status', 
          render: (data: any) => {
            console.log('status value:', data);
            return `<span class="status ${data ? data.toLowerCase() : ''}">${data || ''}</span>`;
          }
        }
      ],
      createdRow: (row: Node, data: any, dataIndex: number) => {
        const tr = row as HTMLElement;
        tr.style.border = '1px solid #dee2e6';
        const cells = tr.querySelectorAll('td');
        cells.forEach((cell: any) => {
          cell.style.border = '1px solid #dee2e6';
          cell.style.padding = '10px 8px';
        });
      }
    };
    this.loadReportData();
    this.loadSites();
    this.loadEmployees();
    
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
    
    this.http.post<any>('https://epicprodapp.samator.com/KineticPilot/api/v2/efx/SGI/SMTTruckCheckApp/getReport', {}, { headers })
      .subscribe({
        next: (response) => {
          const rawData = response.DataSet?.TruckCheck || [];
          // Map API response to expected format
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
            status: item.Status || ''
          }));
          this.filteredData = [...this.reportData];
          
          // Initialize DataTable with data
          this.dtOptions.data = this.filteredData;
          this.dtTrigger.next(null);
          this.isDtInitialized = true;
        },
        error: (err) => {
          console.error('Error loading report data:', err);
          this.reportData = [];
          this.filteredData = [];
        }
      });
  }

  loadSites(): void {
    const basicAuth = btoa(`${environment.api.basicAuth.username}:${environment.api.basicAuth.password}`);
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Basic ${basicAuth}`,
      'x-api-key': environment.api.apiKey
    });
    
    this.http.post<any>('https://epicprodapp.samator.com/KineticPilot/api/v2/efx/SGI/SMTTruckCheckApp/getAllSites', {}, { headers })
      .subscribe({
        next: (response) => {
          const sitesData = response.DataSet?.Sites || [];
          // Filter out empty entries
          this.sites = sitesData
            .filter((site: any) => site.Site)
            .map((site: any) => ({
              Plant: site.Site,
              Name: site.Name
            }));
        },
        error: (err) => console.error('Error loading sites:', err)
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
          // Get distinct employees by EmpCode
          const uniqueMap = new Map();
          employeesData
            .filter((emp: any) => emp.EmpCode && emp.EmpName)
            .forEach((emp: any) => {
              if (!uniqueMap.has(emp.EmpCode)) {
                uniqueMap.set(emp.EmpCode, {
                  EmpCode: emp.EmpCode,
                  EmpName: emp.EmpName
                });
              }
            });
          this.employees = Array.from(uniqueMap.values());
        },
        error: (err) => console.error('Error loading employees:', err)
      });
  }

  ngAfterViewInit(): void {
    // Don't trigger immediately, wait for data to load
  }

applyFilters(): void {
    console.log('Applying filters:', {
      selectedSites: this.selectedSites,
      selectedEmployees: this.selectedEmployees,
      selectedStatuses: this.selectedStatuses
    });
    
    // Always filter from the original reportData, not from filteredData
    this.filteredData = this.reportData.filter(trip => {
      const tripDate = new Date(trip.date);
      const start = this.startDate ? new Date(this.startDate) : null;
      const end = this.endDate ? new Date(this.endDate) : null;
      
      // Date filter
      const dateMatch = (!start || tripDate >= start) && (!end || tripDate <= end);
      
      // Trip type filter
      const typeMatch = this.selectedTripTypes.length === 0 || this.selectedTripTypes.includes(trip.tripType);
      
      // Site filter - if no sites selected, show all; otherwise show if trip.siteCode matches ANY selected site (OR logic)
      const siteMatch = this.selectedSites.length === 0 || this.selectedSites.includes(trip.siteCode);
      
      // Employee filter - if no employees selected, show all; otherwise check if empCode matches ANY selected employee (OR logic)
      const empMatch = this.selectedEmployees.length === 0 || this.selectedEmployees.includes(trip.empCode);
      
      // Status filter - if no statuses selected, show all; otherwise show if trip.status matches ANY selected status (OR logic)
      const statusMatch = this.selectedStatuses.length === 0 || this.selectedStatuses.includes(trip.status);
      
      // Advanced filters
      const advTripNumMatch = !this.tripNum || trip.tripNum.toLowerCase().includes(this.tripNum.toLowerCase());
      const advPlateMatch = !this.plateNumber || trip.plateNumber.toLowerCase().includes(this.plateNumber.toLowerCase());
      const advDriverMatch = !this.driver || trip.driver.toLowerCase().includes(this.driver.toLowerCase());
      const advCoDriverMatch = !this.coDriver || trip.coDriver.toLowerCase().includes(this.coDriver.toLowerCase());
      
      // All conditions must be true (AND logic between different filter types)
      return dateMatch && typeMatch && siteMatch && empMatch && statusMatch && advTripNumMatch && advPlateMatch && advDriverMatch && advCoDriverMatch;
    });
    
    console.log('Filtered data count:', this.filteredData.length);
    console.log(this.filteredData);
    this.rerenderTable();
  }

  toggleAdvancedFilters(): void {
    this.showAdvancedFilters = !this.showAdvancedFilters;
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

  toggleSiteSelection(siteCode: string): void {
    const index = this.selectedSites.indexOf(siteCode);
    if (index > -1) {
      this.selectedSites.splice(index, 1);
    } else {
      this.selectedSites.push(siteCode);
    }
    this.applyFilters();
  }

  toggleSelectAllSites(): void {
    if (this.selectedSites.length === this.sites.length) {
      this.selectedSites = [];
    } else {
      this.selectedSites = this.sites.map(site => site.Plant);
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
    if (this.selectedEmployees.length === this.employees.length) {
      this.selectedEmployees = [];
    } else {
      this.selectedEmployees = this.employees.map(emp => emp.EmpCode);
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

  getFilteredSites(): any[] {
    if (!this.siteSearchTerm) {
      return this.sites;
    }
    const term = this.siteSearchTerm.toLowerCase();
    return this.sites.filter(site => 
      site.Plant.toLowerCase().includes(term) || 
      site.Name.toLowerCase().includes(term)
    );
  }

  getFilteredEmployees(): any[] {
    if (!this.employeeSearchTerm) {
      return this.employees;
    }
    const term = this.employeeSearchTerm.toLowerCase();
    return this.employees.filter(emp => 
      emp.EmpCode.toLowerCase().includes(term) || 
      emp.EmpName.toLowerCase().includes(term)
    );
  }

  closeOtherDropdowns(except: string): void {
    if (except !== 'tripType') this.showTripTypeDropdown = false;
    if (except !== 'site') this.showSiteDropdown = false;
    if (except !== 'employee') this.showEmployeeDropdown = false;
    if (except !== 'status') this.showStatusDropdown = false;
  }

  closeDropdowns(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.multiselect-wrapper')) {
      this.showTripTypeDropdown = false;
      this.showSiteDropdown = false;
      this.showEmployeeDropdown = false;
      this.showStatusDropdown = false;
    }
  }

  clearFilters(): void {
    this.startDate = '';
    this.endDate = '';
    this.selectedTripTypes = [];
    this.selectedSites = [];
    this.selectedEmployees = [];
    this.selectedStatuses = [];
    this.tripNum = '';
    this.plateNumber = '';
    this.driver = '';
    this.coDriver = '';
    this.siteSearchTerm = '';
    this.employeeSearchTerm = '';
    this.applyFilters();
  }

  rerenderTable(): void {
    console.log('rerenderTable called, filteredData length:', this.filteredData.length);
    if (this.isDtInitialized && this.dtElement && this.dtElement.dtInstance) {
      this.dtElement.dtInstance.then((dtInstance: any) => {
        console.log('Clearing and reloading DataTable data...');
        dtInstance.clear();
        dtInstance.rows.add(this.filteredData);
        dtInstance.draw();
        console.log('DataTable reloaded with', this.filteredData.length, 'items');
      });
    } else {
      console.log('DataTable not initialized yet');
    }
  }

  exportToExcel(): void {
    const exportData = this.filteredData.map((trip, index) => ({
      'No': index + 1,
      'Employee No': trip.empCode,
      'Employee Name': trip.empName,
      'Date & Time': trip.date + ' ' + trip.time,
      'SJ': trip.tripNum,
      'Nopol': trip.plateNumber,
      'Odometer (KM)': trip.odometer,
      'Site': trip.siteName + '-' + trip.siteCode,
      'Muatan': trip.cargoQty,
      'Tipe': trip.tripType,
      'Catatan': trip.notes,
      'Driver': trip.driver,
      'Co-Driver': trip.coDriver,
      'Status': trip.status
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Perjalanan');
    
    const fileName = `laporan-perjalanan-${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  }

  ngOnDestroy(): void {
    this.dtTrigger.unsubscribe();
    document.removeEventListener('click', this.closeDropdowns.bind(this));
  }

  logout() {
    this.authService.logout();
  }
}