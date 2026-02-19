import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, TripData, GetTotalFromTripNumberResponse,  GetOutTruckCheckResponse} from '../../services/api.service';
import { EnvironmentIndicatorComponent } from '../environment-indicator/environment-indicator.component';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';

@Component({
  selector: 'app-odometer',
  standalone: true,
  imports: [CommonModule, FormsModule, EnvironmentIndicatorComponent],
  templateUrl: './odometer.component.html',
  styleUrls: ['./odometer.component.css']
})
export class OdometerComponent implements OnInit {
  truckBarcode: string = '';
  tripType: string = '';
  tripNumber: string = '';
  plateNumber: string = '';
  odometerReading: string = '';
  odometerFromDb: number | null = null;
  jumlahMuatan: string = '';
  notes: string = '';
  odometerPhoto: string = '';
  cargoPhoto: string = '';
  isUploading: boolean = false;
  tripDriver: string = '';
  tripLoadFromDb: number | null = null;
  productType: string = '';

  isLoading: boolean = false;

  constructor(private router: Router, private apiService: ApiService) {}

  ngOnInit() {
    this.truckBarcode = localStorage.getItem('currentTruckBarcode') || '';
    this.tripType = localStorage.getItem('tripType') || '';
    this.tripNumber = localStorage.getItem('tripNumber') || '';
    this.tripDriver = localStorage.getItem('tripDriver') || '';

    if (this.tripNumber) {
      if (this.tripType === 'OUT') {
        this.fetchTripTotalLoad(this.tripNumber);
      } else { // kalok IN
        this.fetchOdometer();
      }

      
      
    } else {
      alert('Mohon ulangi isi nomor SPK. Sistem gagal mendapatkan nomor SPK.');
    }

    
    console.log('Odometer Component - Trip Type:', this.tripType);
    console.log('Odometer Component - Trip Type Class:', this.tripType.toLowerCase() + '-trip');
    console.log('Odometer Component - Button Style:', this.getButtonStyle());
    
    
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
    
    if (!this.truckBarcode || !this.tripType) {
      this.router.navigate(['/trip-selection']);
    }
  }

  fetchTripTotalLoad(tripNumberStr: string) {
    this.isLoading = true;

    // Call the service method
    this.apiService.getTotalFromTripNumber(tripNumberStr)
      .subscribe({
        next: (response: GetTotalFromTripNumberResponse) => {
          console.log('API Response received:', response);
          this.isLoading = false;
            
          this.tripLoadFromDb = response.total; 
          this.productType = response.type;
          
        },
        
        error: (error) => {
          this.isLoading = false;
          alert('Error connecting to server.');
        },
      });
  }

   fetchOdometer() {
    this.isLoading = true;

    // Call the service method
    this.apiService.getOutTruckCheck()
      .subscribe({
        next: (response: GetOutTruckCheckResponse) => {
          console.log('API Response received:', response);
          this.isLoading = false;
            
          const matchingTrip = response.TruckCheckData.Result.find(
            (item) => item.TripNum === this.tripNumber
          );

          if (matchingTrip) {
            this.odometerFromDb = matchingTrip.Odometer;
          } else {
            alert('Gagal mengambil data odometer, gunakan surat jalan sebagai referensi odometer.');
          }
          
        },
        
        error: (error) => {
          this.isLoading = false;
          alert('Error connecting to server.');
        },
      });
  }

  onPhotoSelected(event: Event, type: 'odometer' | 'cargo') {
    const input = event.target as HTMLInputElement;
    if (!input.files || !input.files[0]) return;

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 800;
        let width = img.width;
        let height = img.height;

        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          } else {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);

        const compressed = canvas.toDataURL('image/jpeg', 0.7);
        if (type === 'odometer') {
          this.odometerPhoto = compressed;
        } else {
          this.cargoPhoto = compressed;
        }
      };
      img.src = reader.result as string;
    };

    reader.readAsDataURL(file);
    input.value = '';
  }

  removePhoto(type: 'odometer' | 'cargo') {
    if (type === 'odometer') {
      this.odometerPhoto = '';
    } else {
      this.cargoPhoto = '';
    }
  }

  onSubmit() {
    console.log('Form submitted with values:', {
      odometerReading: this.odometerReading,
      jumlahMuatan: this.jumlahMuatan,
      notes: this.notes,
      truckBarcode: this.truckBarcode,
      tripType: this.tripType
    });


    if (!this.odometerReading) {
      alert('Silahkan isi pembacaan odometer');
      return;
    }

    if (!this.odometerPhoto || !this.cargoPhoto) {
      alert('Silakan ambil foto odometer dan foto muatan');
      return;
    }

    if (!this.jumlahMuatan) {
      alert('Silakan isi jumlah muatan');
      return;
    }

    // Validate odometer reading
    const odometerValue = parseFloat(this.odometerReading);
    if (isNaN(odometerValue) || odometerValue < 0) {
      alert('Pembacaan odometer harus berupa angka yang valid dan tidak negatif');
      return;
    }

    const jumlahMuatanValue = parseFloat(this.jumlahMuatan);
    if (isNaN(jumlahMuatanValue) || jumlahMuatanValue < 0) {
      alert('Jumlah muatan harus berupa angka yang valid dan tidak negatif');
      return;
    }

    // Get trip data from localStorage (set by checklist component for OUT trips)
    const savedTripData = localStorage.getItem('tripData');
    const tripNumber = localStorage.getItem('tripNumber') || '';
    
    console.log('📦 Retrieved localStorage data:', {
      savedTripData: savedTripData ? JSON.parse(savedTripData) : null,
      tripNumber: tripNumber,
      tripType: this.tripType
    });

    let tripData: TripData;
    
    if (savedTripData && this.tripType === 'OUT') {
      // For OUT trips, use data from checklist
      try {
        tripData = JSON.parse(savedTripData);
        tripData.odometer = odometerValue;
        tripData.note = this.notes || ''; // Add notes from odometer form
        console.log('✅ Using saved checklist data for OUT trip');
      } catch (e) {
        console.error('❌ Failed to parse saved trip data:', e);
        alert('Gagal membaca data perjalanan tersimpan. Silakan coba lagi.');
        return;
      }
    } else {
      // odometer input harus <= odometer dari DB
      if (this.odometerFromDb) {
        const odometerFromDbValue = this.odometerFromDb;
        if (odometerValue < odometerFromDbValue) {
          alert(`Data odometer yang Anda masukkan (${odometerValue}) kurang dari pembacaan odometer terakhir yang tercatat di sistem (${odometerFromDbValue}). Silakan periksa kembali pembacaan odometer Anda.`);
          return;
        }
      }
      // For IN trips or if no saved data, create new trip data
      tripData = {
        odometer: odometerValue,
        type: this.tripType,
        chk1: false, // For IN trips, all checks are false
        chk2: false,
        tripNum: tripNumber,
        note: this.notes || '',
        tripDriver: this.tripDriver || ''
      };
      console.log('✅ Created new trip data for IN trip or missing checklist data');
    }
    
    console.log('📋 Final trip data to send:', tripData);

    // Validate required fields
    if (!tripData.tripNum) {
      console.warn('⚠️ Warning: tripNum is empty');
      // Don't block submission, as API might accept empty tripNum
    }
    
    // Upload photos to Go backend (if running)
    const tripNum = tripData.tripNum || 'unknown';
    this.apiService.uploadPhotos(tripNum, this.odometerPhoto, this.cargoPhoto).subscribe({
      next: (res) => {
        console.log('Photos uploaded to backend:', res);
      },
      error: (err) => {
        console.warn('Photo upload to backend failed (server mungkin belum jalan), foto tetap tersimpan lokal:', err.message);
      }
    });

    // Send data to API
    this.sendTripDataToAPI(tripData);

    // Save trip data locally including photos
    const localTripData = {
      truckBarcode: this.truckBarcode,
      tripType: this.tripType,
      odometerReading: this.odometerReading,
      notes: this.notes,
      odometerPhoto: this.odometerPhoto,
      cargoPhoto: this.cargoPhoto,
      timestamp: new Date().toISOString(),
      checklistData: this.tripType === 'OUT' ? localStorage.getItem('checklistData') : null
    };
    
    console.log('💾 Saving local trip data:', localTripData);
    
    // Save to localStorage (in real app, would send to server)
    const existingTrips = JSON.parse(localStorage.getItem('trips') || '[]');
    existingTrips.push(localTripData);
    localStorage.setItem('trips', JSON.stringify(existingTrips));
    
    console.log('🧹 Cleaning up localStorage...');
    // Clean up temporary data
    localStorage.removeItem('currentTruckBarcode');
    localStorage.removeItem('tripType');
    localStorage.removeItem('checklistData');
    localStorage.removeItem('tripData');
    localStorage.removeItem('tripNumber');
    
    console.log('🚀 Navigating to trip-complete page...');
    this.router.navigate(['/trip-complete']);
  }

  // Method to get button style based on trip type
  getButtonStyle() {
    if (this.tripType === 'OUT') {
      return {
        'background': 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
        'border': 'none',
        'color': 'white'
      };
    } else {
      return {
        'background': 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
        'border': 'none',
        'color': 'white'
      };
    }
  }

  // Function to send data to API
  sendTripDataToAPI(tripData: TripData) {
    console.log('Sending trip data to API:', tripData);
    
    this.apiService.sendTripData(tripData).subscribe({
      next: (response) => {
        console.log('API Response:', response);
        
        // For this API, any successful response (even if it has content) is considered success
        // The API might return error details in response body even for 200 status
        if (response && response.error) {
          console.error('API returned error in response body:', response);
          alert('Kesalahan dari server: ' + (response.message || response.error || JSON.stringify(response)));
        } else {
          console.log('Trip data submission successful!');
          console.log('Data sent to server:', tripData);
          alert('Data trip berhasil dikirim ke server!');
          
          // After successful insert to staging table, process the trip data to Epicor
          // this.processDataToEpicor(tripData.tripNum);
        }
      },
      error: (error) => {
        console.error('Error sending trip data:', error);
        
        let errorMessage = 'Gagal mengirim data ke server';
        
        if (error.status === 0) {
          errorMessage += ' - Periksa koneksi internet Anda.';
        } else if (error.status === 400) {
          errorMessage += ' - Data yang dikirim tidak valid.';
        } else if (error.status === 401) {
          errorMessage += ' - Autentikasi gagal.';
        } else if (error.status === 403) {
          errorMessage += ' - Akses ditolak.';
        } else if (error.status === 404) {
          errorMessage += ' - Endpoint API tidak ditemukan.';
        } else if (error.status === 409) {
          errorMessage += ' - Data konflik dengan server.';
        } else if (error.status >= 500) {
          errorMessage += ' - Kesalahan server.';
        } else {
          errorMessage += ` - HTTP ${error.status}: ${error.statusText}`;
        }
        
        alert(errorMessage + '\n\nData tetap tersimpan secara lokal.');
      }
    });
  }

  // Function to process trip data to Epicor
  // processDataToEpicor(tripNum: string) {
  //   console.log('Processing trip data to Epicor for trip:', tripNum);
    
  //   this.apiService.processTripData(tripNum).subscribe({
  //     next: (response) => {
  //       console.log('✅ Process to Epicor successful:', response);
  //       alert('Data berhasil diproses ke sistem Epicor!');
  //     },
  //     error: (error) => {
  //       console.error('❌ Error processing to Epicor:', error);
        
  //       let errorMessage = 'Gagal memproses data ke sistem Epicor';
        
  //       if (error.status === 0) {
  //         errorMessage += ' - Periksa koneksi internet.';
  //       } else if (error.status === 400) {
  //         errorMessage += ' - Data tidak valid untuk proses Epicor.';
  //       } else if (error.status === 401) {
  //         errorMessage += ' - Authentication gagal.';
  //       } else if (error.status === 500) {
  //         errorMessage += ' - Server error saat proses ke Epicor.';
  //       } else {
  //         errorMessage += ` - HTTP ${error.status}: ${error.statusText}`;
  //       }
        
  //       alert(errorMessage + '\n\nData sudah tersimpan di staging table, tapi gagal diproses ke Epicor.');
  //     }
  //   });
  // }

  goBack() {
    // if (this.tripType === 'OUT') {
    //   this.router.navigate(['/checklist']);
    // } else {
    //   this.router.navigate(['/trip-selection']);
    // }
    this.router.navigate(['/scan-barcode']);
  }
}
