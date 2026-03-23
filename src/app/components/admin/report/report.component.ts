import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataTablesModule } from 'angular-datatables';
import { Subject } from 'rxjs';
import { Config } from 'datatables.net';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-report',
  standalone: true,
  imports: [CommonModule, FormsModule, DataTablesModule],
  templateUrl: './report.component.html',
  styleUrls: ['./report.component.css']
})

export class ReportComponent implements OnInit, OnDestroy {
  dtOptions: Config = {};
  dtTrigger: Subject<any> = new Subject<any>();
  
  // Filter properties
  startDate: string = '';
  endDate: string = '';
  siteCode: string = '';
  filteredData: any[] = [];
  
  reportData = [
    {
      id: 1,
      date: '2024-01-15',
      sjNumber: 'SJ001234',
      plateNumber: 'B 1234 ABC',
      driver: 'Ahmad Suryanto',
      type: 'OUT',
      odometer: 125430,
      muatan: '50 cylinder',
      status: 'Selesai',
      siteCode: 'JKT01'
    },
    {
      id: 2,
      date: '2024-01-15',
      sjNumber: 'SJ001235',
      plateNumber: 'B 5678 DEF',
      driver: 'Budi Santoso',
      type: 'IN',
      odometer: 98765,
      muatan: '45 cylinder',
      status: 'Selesai',
      siteCode: 'JKT01'
    },
    {
      id: 3,
      date: '2024-01-14',
      sjNumber: 'SJ001236',
      plateNumber: 'B 9012 GHI',
      driver: 'Candra Wijaya',
      type: 'OUT',
      odometer: 156789,
      muatan: '60 cylinder',
      status: 'Proses',
      siteCode: 'BDG01'
    },
    {
      id: 4,
      date: '2024-01-14',
      sjNumber: 'SJ001237',
      plateNumber: 'B 3456 JKL',
      driver: 'Dedi Kurniawan',
      type: 'IN',
      odometer: 87654,
      muatan: '35 cylinder',
      status: 'Selesai',
      siteCode: 'BDG01'
    },
    {
      id: 5,
      date: '2024-01-13',
      sjNumber: 'SJ001238',
      plateNumber: 'B 7890 MNO',
      driver: 'Eko Prasetyo',
      type: 'OUT',
      odometer: 134567,
      muatan: '55 cylinder',
      status: 'Selesai',
      siteCode: 'SBY01'
    },
    {
      id: 6,
      date: '2024-01-13',
      sjNumber: 'SJ001239',
      plateNumber: 'B 2468 PQR',
      driver: 'Fajar Nugroho',
      type: 'IN',
      odometer: 112233,
      muatan: '40 cylinder',
      status: 'Selesai',
      siteCode: 'SBY01'
    },
    {
      id: 7,
      date: '2024-01-12',
      sjNumber: 'SJ001240',
      plateNumber: 'B 1357 STU',
      driver: 'Gunawan Saputra',
      type: 'OUT',
      odometer: 145678,
      muatan: '65 cylinder',
      status: 'Proses',
      siteCode: 'JKT01'
    },
    {
      id: 8,
      date: '2024-01-12',
      sjNumber: 'SJ001241',
      plateNumber: 'B 9753 VWX',
      driver: 'Hendra Wijaya',
      type: 'IN',
      odometer: 98432,
      muatan: '30 cylinder',
      status: 'Selesai',
      siteCode: 'BDG01'
    }
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
      'ID': trip.id,
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
}