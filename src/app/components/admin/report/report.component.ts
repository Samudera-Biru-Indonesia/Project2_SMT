import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataTablesModule } from 'angular-datatables';
import { Subject } from 'rxjs';
import { Config } from 'datatables.net';
import * as XLSX from 'xlsx';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-report',
  standalone: true,
  imports: [CommonModule, FormsModule, DataTablesModule],
  templateUrl: './report.component.html',
  styleUrls: ['./report.component.css']
})

export class ReportComponent implements OnInit, OnDestroy {

  constructor(/*private router: Router, private apiService: ApiService, */private authService: AuthService) {}

  dtOptions: Config = {};
  dtTrigger: Subject<any> = new Subject<any>();
  
  // Filter properties
  startDate: string = '';
  endDate: string = '';
  siteCode: string = '';
  filteredData: any[] = [];
  
  reportData = [
    {
      empCode: 'S86126836',
      empName: 'Budi Budiman',
      date: '2024-01-15',
      time: '08:00',
      tripNum: 'SGI060-00528931',
      
      plateNumber: 'B 1234 ABC',
      odometer: 125430,

      siteCode: 'SGI018',
      siteName: 'SGI Semarang',
      sjNumber: 'SJ001234',

      cargoQty: 50,
      tripType: 'IN',
      notes: '',
      
      driver: 'Ahmad Suryanto',
      coDriver: 'Budi Dibudikan',
      
      
      status: 'VALID',
    },
    {
      empCode: 'S86126819',
      empName: 'Anna Grace',
      date: '2024-01-16',
      time: '08:09',
      tripNum: 'SGI060-00528931',
      
      plateNumber: 'B 6767 GGG',
      odometer: 123,

      siteCode: 'SGI018',
      siteName: 'SGI Semarang',
      sjNumber: 'SJ001234',

      cargoQty: 50,
      tripType: 'IN',
      notes: 'Tangki LO2 & LO3',
      
      driver: 'Ahmad Suryanto',
      coDriver: 'Budi Dibudikan',
      
      
      status: 'VALID',
    },
    {
      empCode: 'S86126836',
      empName: 'Budi Budiman',
      date: '2024-01-15',
      time: '08:00',
      tripNum: 'SGI060-00528931',
      
      plateNumber: 'B 1234 ABC',
      odometer: 125430,

      siteCode: 'SGI018',
      siteName: 'SGI Semarang',
      sjNumber: 'SJ001234',

      cargoQty: 50,
      tripType: 'IN',
      notes: '',
      
      driver: 'Ahmad Suryanto',
      coDriver: 'Budi Dibudikan',
      
      
      status: 'CANCELLED',
    },
    {
      empCode: 'S86126836',
      empName: 'Budi Budiman',
      date: '2024-01-15',
      time: '08:00',
      tripNum: 'SGI060-00528931',
      
      plateNumber: 'B 1234 ABC',
      odometer: 125430,

      siteCode: 'SGI018',
      siteName: 'SGI Semarang',
      sjNumber: 'SJ001234',

      cargoQty: 50,
      tripType: 'IN',
      notes: '',
      
      driver: 'Ahmad Suryanto',
      coDriver: 'Budi Dibudikan',
      
      
      status: 'CANCELLED',
    },
    {
      empCode: 'S86126836',
      empName: 'Budi Budiman',
      date: '2024-01-15',
      time: '08:00',
      tripNum: 'SGI060-00528931',
      
      plateNumber: 'B 1234 ABC',
      odometer: 125430,

      siteCode: 'SGI018',
      siteName: 'SGI Semarang',
      sjNumber: 'SJ001234',

      cargoQty: 50,
      tripType: 'IN',
      notes: '',
      
      driver: 'Ahmad Suryanto',
      coDriver: 'Budi Dibudikan',
      
      
      status: 'CANCELLED',
    },
  ];

  ngOnInit(): void {
    this.filteredData = [...this.reportData];
    this.dtOptions = {
      pagingType: 'full_numbers',
      pageLength: 5,
      processing: true,
      lengthMenu: [5, 10, 25, 50],
      searching: true,
      ordering: true,
      info: true
    };
  }

  applyFilters(): void {
    this.filteredData = this.reportData.filter(trip => {
      const tripDate = new Date(trip.date);
      const start = this.startDate ? new Date(this.startDate) : null;
      const end = this.endDate ? new Date(this.endDate) : null;
      
      const dateMatch = (!start || tripDate >= start) && (!end || tripDate <= end);
      const siteMatch = !this.siteCode || trip.siteCode.toLowerCase().includes(this.siteCode.toLowerCase());
      
      return dateMatch && siteMatch;
    });
  }

  clearFilters(): void {
    this.startDate = '';
    this.endDate = '';
    this.siteCode = '';
    this.filteredData = [...this.reportData];
  }

  exportToExcel(): void {
    const exportData = this.filteredData.map(trip => ({
      'Tanggal': trip.date,
      'Nomor SJ': trip.sjNumber,
      'Plat Nomor': trip.plateNumber,
      'Driver': trip.driver,
      'Jenis': trip.type,
      'Odometer (km)': trip.odometer,
      'Muatan': trip.muatan,
      'Status': trip.status,
      'Kode Site': trip.siteCode
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Perjalanan');
    
    const fileName = `laporan-perjalanan-${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  }

  ngOnDestroy(): void {
    this.dtTrigger.unsubscribe();
  }

  logout() {
    this.authService.logout();
  }
}