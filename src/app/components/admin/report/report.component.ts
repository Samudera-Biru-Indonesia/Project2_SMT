import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataTablesModule } from 'angular-datatables';
import { Subject } from 'rxjs';
import { Config } from 'datatables.net';
import * as XLSX from 'xlsx';
import * as ExcelJS from 'exceljs';
import { AuthService } from '../../../services/auth.service';
import { ApiService } from '../../../services/api.service';
import { EnvironmentService } from '../../../services/environment.service';
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
    private environmentService: EnvironmentService,
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

  // Photo modal
  showPhotoModal: boolean = false;
  modalTripNum: string = '';
  modalPhotos: { id: string; name: string; url: string }[] = [];
  loadingPhotos: boolean = false;
  selectedPhotoUrl: string = '';
  photoError: string = '';

  private photoBtnClickHandler = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    if (target.classList.contains('view-photos-btn')) {
      //const status = target.getAttribute('status')
      const tripNum = target.getAttribute('data-tripnum') || '';
      const tripType = target.getAttribute('data-triptype') || '';
      this.openPhotoModal(tripNum, tripType).catch(err => console.error(err));
    }
  };

  ngOnInit(): void {
    // Set default date filter to last 3 days
    const today = new Date();
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(today.getDate() - 3);
    
    this.startDate = threeDaysAgo.toISOString().split('T')[0];
    this.endDate = today.toISOString().split('T')[0];

    // Pre-set site filter from login before first API call
    const loginSite = localStorage.getItem('currentPlant');
    if (loginSite) {
      this.selectedSites = [loginSite];
    }

    this.dtOptions = {
      pagingType: 'full_numbers',
      pageLength: 5,
      processing: true,
      lengthMenu: [5, 10, 25, 50],
      searching: false,
      ordering: true,
      order: [],
      info: true,
      data: [],
      columns: [
        { title: 'No.', data: null, render: (data: any, type: any, row: any, meta: any) => meta.row + 1 },
        { title: 'Employee No.', data: 'empCode' },
        { title: 'Employee Name', data: 'empName' },
        { title: 'Date & Time', data: null, render: (data: any, type: any, row: any) => {
          const date = row.date || '';
          const time = row.time || '';
          return date && time ? `${date} ${time}` : (date || time || '');
        }},
        { title: 'SJ', data: 'tripNum' },
        { title: 'Kategori Kendaraan', data: 'truckCategory' },
        { title: 'Nopol', data: 'plateNumber' },
        { title: 'Odometer (KM)', data: 'odometer' },
        { title: 'Site', data: null, render: (data: any, type: any, row: any) => {
          const siteName = row.siteName || '';
          const siteCode = row.siteCode || '';
          return siteName && siteCode ? `${siteName}-${siteCode}` : (siteName || siteCode || '');
        }},
        { title: 'Muatan', data: 'cargoQty' },
        { 
          title: 'Tipe', 
          data: 'tripType', 
          render: (data: any) => {
            if (!data) return '';
            const lowerData = data.toLowerCase();
            if (lowerData === 'out') {
              return `<span style="background: #dc3545; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 600; text-transform: uppercase; display: inline-block;">${data}</span>`;
            } else if (lowerData === 'in') {
              return `<span style="background: #28a745; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 600; text-transform: uppercase; display: inline-block;">${data}</span>`;
            }
            return data;
          }
        },
        { title: 'Catatan', data: 'notes', render: (data: any) => {
          if (!data) return '';
          const maxLen = 40;
          if (data.length <= maxLen) return data;
          const wrapped = data.replace(new RegExp(`(.{${maxLen}})`, 'g'), '$1<br>');
          return `<span style="white-space:normal;">${wrapped}</span>`;
        }},
        { title: 'Driver', data: 'driver' },
        { title: 'Co-Driver', data: 'coDriver' },
        {
          title: 'Status',
          data: 'status',
          render: (data: any) => {
            if (!data) return '';
            const lowerData = data.toLowerCase();
            if (lowerData === 'valid') {
              return `<span style="background: #83C86F; color: #155724; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 600; display: inline-block;">${data}</span>`;
            } else if (lowerData === 'cancelled') {
              return `<span style="background: #C86F6F; color: #3a2c01; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 600; display: inline-block;">${data}</span>`;
            }
            return data;
          }
        },
        {
          title: 'Foto',
          data: 'status',
          orderable: false,
          render: (data: any, type: any, row: any) => {
            if (!data) return '';
            const lowerData = data.toLowerCase();
            return lowerData === 'valid' ? `<button class="view-photos-btn" data-tripnum="${row.tripNum}" data-triptype="${row.tripType}" style="background:#17a2b8;color:white;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;font-size:12px;white-space:nowrap;">&#128247; Lihat</button>` : '';
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
    const currentEnv = this.environmentService.getCurrentEnvironment();
    const basicAuth = btoa(`${environment.api.basicAuth.username}:${environment.api.basicAuth.password}`);
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Basic ${basicAuth}`,
      'x-api-key': currentEnv.apiKey
    });

    // Build payload based on filters
    const payload: any = {
      sites: this.selectedSites.length > 0 ? this.selectedSites.join('~') : '',
      startDate: this.startDate || '',
      endDate: this.endDate || ''
    };

    this.http.post<any>(currentEnv.baseUrl + '/getReport', payload, { headers })
      .subscribe({
        next: (response) => {
          const rawData = response.DataSet?.TruckCheck || [];
          // Map API response to expected format
          this.reportData = rawData.map((item: any) => ({
            empCode: item.EmpCode || '-',
            empName: item.EmpName || '-',
            date: item.TripDate ? item.TripDate.split('T')[0] : '-',
            time: item.TripTime || '-',
            tripNum: item.TripNum || '-',
            truckCategory: item.TruckCategory || '-',
            plateNumber: item.PlateNum || item.SystemPlateNum || '-',
            odometer: item.OdometerReading || 0,
            siteCode: item.SiteCode || '-',
            siteName: item.SiteName || '-',
            cargoQty: item.CargoQty || 0,
            tripType: item.TripType || '-',
            notes: item.Notes || '-',
            driver: item.Driver || '-',
            coDriver: item.CoDriver || '-',
            status: item.Status || '-'
          }));
          
          // Apply client-side filters (for other filters like employee, status, etc.)
          this.applyFilters();
          
          // Initialize or update DataTable with filtered data
          if (!this.isDtInitialized) {
            this.dtOptions.data = this.filteredData;
            this.dtTrigger.next(null);
            this.isDtInitialized = true;
          } else {
            this.rerenderTable();
          }
        },
        error: (err) => {
          console.error('Error loading report data:', err);
          this.reportData = [];
          this.filteredData = [];
        }
      });
  }

  loadSites(): void {
    const currentEnv = this.environmentService.getCurrentEnvironment();
    const basicAuth = btoa(`${environment.api.basicAuth.username}:${environment.api.basicAuth.password}`);
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Basic ${basicAuth}`,
      'x-api-key': currentEnv.apiKey
    });

    this.http.post<any>(currentEnv.baseUrl + '/GetListPlant', {}, { headers })
      .subscribe({
        next: (response) => {
          const plantsData = response.Result?.Plant || [];
          this.sites = plantsData
            .filter((plant: any) => plant.Plant)
            .map((plant: any) => ({
              Plant: plant.Plant,
              Name: plant.Name || ''
            }));
          console.log('Sites loaded:', this.sites.length, 'sites');
          
          // Confirm pre-selected site still exists in the sites list
          const loginSite = localStorage.getItem('currentPlant');
          if (loginSite && !this.sites.some(site => site.Plant === loginSite)) {
            this.selectedSites = [];
          }
        },
        error: (err) => console.error('Error loading sites:', err)
      });
  }

  loadEmployees(): void {
    const currentEnv = this.environmentService.getCurrentEnvironment();
    const basicAuth = btoa(`${environment.api.basicAuth.username}:${environment.api.basicAuth.password}`);
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Basic ${basicAuth}`,
      'x-api-key': currentEnv.apiKey
    });

    this.http.post<any>(currentEnv.baseUrl + '/getAllSatpam', {}, { headers })
      .subscribe({
        next: (response) => {
          const employeesData = response.DataSet?.Employees || [];
          // Store all employees with their site information
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

  ngAfterViewInit(): void {
    document.addEventListener('click', this.photoBtnClickHandler);
  }

applyFilters(): void {
    console.log('Applying filters:', {
      selectedSites: this.selectedSites,
      selectedEmployees: this.selectedEmployees,
      selectedStatuses: this.selectedStatuses
    });
    
    // Always filter from the original reportData, not from filteredData
    this.filteredData = this.reportData.filter(trip => {
      // Trip type filter
      const typeMatch = this.selectedTripTypes.length === 0 || this.selectedTripTypes.includes(trip.tripType);
      
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
      return typeMatch && empMatch && statusMatch && advTripNumMatch && advPlateMatch && advDriverMatch && advCoDriverMatch;
    });
    
    console.log('Filtered data count:', this.filteredData.length);
    console.log(this.filteredData);
    this.rerenderTable();
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

  toggleSiteSelection(siteCode: string): void {
    const index = this.selectedSites.indexOf(siteCode);
    if (index > -1) {
      this.selectedSites.splice(index, 1);
    } else {
      this.selectedSites.push(siteCode);
    }
    
    // Clear selected employees that don't belong to the selected sites
    if (this.selectedSites.length > 0) {
      const validEmployees = this.getFilteredEmployees().map(emp => emp.EmpCode);
      this.selectedEmployees = this.selectedEmployees.filter(empCode => 
        validEmployees.includes(empCode)
      );
    }
    
    // Reload data from API with new site filter
    this.loadReportData();
  }

  toggleSelectAllSites(): void {
    if (this.selectedSites.length === this.sites.length) {
      this.selectedSites = [];
    } else {
      this.selectedSites = this.sites.map(site => site.Plant);
    }
    // Reload data from API with new site filter
    this.loadReportData();
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
    let filteredBySearch = this.employees;
    
    // Filter by search term
    if (this.employeeSearchTerm) {
      const term = this.employeeSearchTerm.toLowerCase();
      filteredBySearch = this.employees.filter(emp => 
        emp.EmpCode.toLowerCase().includes(term) || 
        emp.EmpName.toLowerCase().includes(term)
      );
    }
    
    // Filter by selected sites
    if (this.selectedSites.length > 0) {
      filteredBySearch = filteredBySearch.filter(emp => 
        this.selectedSites.includes(emp.Site)
      );
    }
    
    // Get distinct employees by EmpCode
    const uniqueMap = new Map();
    filteredBySearch.forEach((emp: any) => {
      if (!uniqueMap.has(emp.EmpCode)) {
        uniqueMap.set(emp.EmpCode, emp);
      }
    });
    
    return Array.from(uniqueMap.values());
  }

  getSelectedSiteName(): string {
    if (this.selectedSites.length === 1) {
      const site = this.sites.find(s => s.Plant === this.selectedSites[0]);
      return site ? `${site.Plant} - ${site.Name}` : this.selectedSites[0];
    }
    return '';
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
    // Reload data from API since date and site filters are cleared
    this.loadReportData();
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

  async exportToExcel(): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Laporan Perjalanan');
    
    // Add headers
    worksheet.columns = [
      { header: 'No', key: 'no', width: 5 },
      { header: 'Employee No', key: 'empCode', width: 15 },
      { header: 'Employee Name', key: 'empName', width: 20 },
      { header: 'Date & Time', key: 'dateTime', width: 18 },
      { header: 'SJ', key: 'tripNum', width: 15 },
      { header: 'Kategori Kendaraan', key: 'truckCategory', width: 15 },
      { header: 'Nopol', key: 'plateNumber', width: 12 },
      { header: 'Odometer (KM)', key: 'odometer', width: 15 },
      { header: 'Site', key: 'site', width: 20 },
      { header: 'Muatan', key: 'cargoQty', width: 10 },
      { header: 'Tipe', key: 'tripType', width: 10 },
      { header: 'Catatan', key: 'notes', width: 25 },
      { header: 'Driver', key: 'driver', width: 20 },
      { header: 'Co-Driver', key: 'coDriver', width: 20 },
      { header: 'Status', key: 'status', width: 12 }
    ];
    
    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF8F9FA' }
    };
    
    // Add data rows
    this.filteredData.forEach((trip, index) => {
      const row = worksheet.addRow({
        no: index + 1,
        empCode: trip.empCode || '',
        empName: trip.empName || '',
        dateTime: trip.date && trip.time ? `${trip.date} ${trip.time}` : (trip.date || trip.time || ''),
        tripNum: trip.tripNum || '',
        truckCategory: trip.truckCategory || '',
        plateNumber: trip.plateNumber || '',
        odometer: trip.odometer || '',
        site: trip.siteName && trip.siteCode ? `${trip.siteName}-${trip.siteCode}` : (trip.siteName || trip.siteCode || ''),
        cargoQty: trip.cargoQty || '',
        tripType: trip.tripType || '',
        notes: trip.notes || '',
        driver: trip.driver || '',
        coDriver: trip.coDriver || '',
        status: trip.status || ''
      });
      
      // Style Tipe column (column 11)
      const tipeCell = row.getCell(11);
      if (trip.tripType) {
        const lowerType = trip.tripType.toLowerCase();
        if (lowerType === 'out') {
          tipeCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFDC3545' }
          };
          tipeCell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
        } else if (lowerType === 'in') {
          tipeCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF28A745' }
          };
          tipeCell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
        }
      }
      
      // Style Status column (column 15)
      const statusCell = row.getCell(15);
      if (trip.status) {
        const lowerStatus = trip.status.toLowerCase();
        if (lowerStatus === 'valid') {
          statusCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF83C86F' }
          };
          statusCell.font = { color: { argb: 'FF155724' }, bold: true };
        } else if (lowerStatus === 'cancelled') {
          statusCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFC86F6F' }
          };
          statusCell.font = { color: { argb: 'FF3A2C01' }, bold: true };
        }
      }
    });
    
    // Generate file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const fileName = `laporan-perjalanan-${new Date().toISOString().split('T')[0]}.xlsx`;
    
    // Download file
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    window.URL.revokeObjectURL(link.href);
  }

  async openPhotoModal(tripNum: string, tripType: string): Promise<void> {
    this.showPhotoModal = true;
    this.modalTripNum = tripNum;
    this.modalPhotos = [];
    this.selectedPhotoUrl = '';
    this.photoError = '';
    this.loadingPhotos = true;
    this.cdr.detectChanges();

    let token = this.authService.getToken();
    if (!token || this.authService.isJwtExpired()) {
      token = await this.authService.getJwt();
    }

    if (!token) {
      this.loadingPhotos = false;
      this.photoError = 'Sesi tidak valid. Silakan logout lalu login kembali.';
      this.cdr.detectChanges();
      return;
    }

    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    const condition = encodeURIComponent(tripType);

    this.http.get<{ id: string; name: string }[]>(
      `${environment.backendUrl}/api/get-photos?tripNum=${encodeURIComponent(tripNum)}&condition=${condition}`,
      { headers }
    ).subscribe({
      next: (photos) => {
        const bust = Date.now();
        this.modalPhotos = photos.map(p => ({
          id: p.id,
          name: p.name,
          url: `${environment.backendUrl}/api/photo/${p.id}?t=${bust}`
        }));
        this.loadingPhotos = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading photos:', err);
        this.loadingPhotos = false;
        if (err.status === 0) {
          this.photoError = 'Tidak dapat terhubung ke backend. Pastikan server backend sudah berjalan.';
        } else if (err.status === 401) {
          this.photoError = 'Sesi habis. Silakan logout lalu login kembali.';
        } else if (err.status === 503) {
          this.photoError = 'Layanan Google Drive tidak tersedia di backend.';
        } else {
          this.photoError = `Gagal memuat foto (${err.status}). Cek console untuk detail.`;
        }
        this.cdr.detectChanges();
      }
    });
  }

  closePhotoModal(): void {
    this.showPhotoModal = false;
    this.selectedPhotoUrl = '';
    this.modalPhotos = [];
  }

  selectPhoto(url: string): void {
    this.selectedPhotoUrl = url;
  }

  closeSelectedPhoto(): void {
    this.selectedPhotoUrl = '';
  }

  ngOnDestroy(): void {
    this.dtTrigger.unsubscribe();
    document.removeEventListener('click', this.closeDropdowns.bind(this));
    document.removeEventListener('click', this.photoBtnClickHandler);
  }

  logout() {
    this.authService.logout();
  }
}