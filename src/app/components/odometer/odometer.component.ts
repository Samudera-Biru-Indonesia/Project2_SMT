import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, TripData, GetTotalFromTripNumberResponse,  GetOutTruckCheckResponse} from '../../services/api.service';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-odometer',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
  photoUploadWarning: string = '';
  tripDriver: string = '';
  expectedMuatan: number | null = null;
  muatanType: string = '';
  isOdometerWrong: boolean = false;

  get muatanMismatchWarning(): boolean {
    if (this.muatanType !== 'CYLINDER' || this.expectedMuatan === null || !this.jumlahMuatan) return false;
    const entered = parseFloat(this.jumlahMuatan);
    return !isNaN(entered) && entered !== this.expectedMuatan;
  }
  tripLoadFromDb: number | null = null;
  productType: string = '';

  isLoading: boolean = false;
  showOdometerWarning: boolean = false;
  odometerWarningShown: boolean = false;
  showMuatanLowWarning: boolean = false;
  muatanLowWarningShown: boolean = false;
  showMuatanHighWarning: boolean = false;
  muatanHighWarningShown: boolean = false;

  constructor(private router: Router, private apiService: ApiService, private authService: AuthService) {}

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

    // Get plate number from trip data if available
    const tripDataString = localStorage.getItem('currentTripData');
    if (tripDataString) {
      try {
        const tripData = JSON.parse(tripDataString);
        this.plateNumber = tripData?.truckPlate || 'N/A';
        this.tripDriver = tripData?.driver || 'N/A';
      } catch (error) {
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

    if (this.tripType === 'OUT' && this.tripNumber) {
      this.apiService.getTotalFromTripNumber(this.tripNumber).subscribe({
        next: (res) => {
          this.expectedMuatan = res.total;
          this.muatanType = res.type;
        },
        error: () => {}
      });
    }
  }

  fetchTripTotalLoad(tripNumberStr: string) {
    this.isLoading = true;

    this.apiService.getTotalFromTripNumber(tripNumberStr)
      .subscribe({
        next: (response: GetTotalFromTripNumberResponse) => {
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

    this.apiService.getOutTruckCheck()
      .subscribe({
        next: (response: GetOutTruckCheckResponse) => {
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

  onOdometerChange() {
    this.showOdometerWarning = false;
    this.odometerWarningShown = false;
  }

  onMuatanChange() {
    this.showMuatanLowWarning = false;
    this.muatanLowWarningShown = false;
    this.showMuatanHighWarning = false;
    this.muatanHighWarningShown = false;
  }

  // confirmOdometerWarning() {
  //   this.showOdometerWarning = false;
  //   this.onSubmit();
  // }

  dismissOdometerWarning() {
    this.showOdometerWarning = false;
    this.odometerWarningShown = false;
  }

  confirmMuatanWarning() {
    this.showMuatanLowWarning = false;
    this.onSubmit();
  }

  dismissMuatanWarning() {
    this.showMuatanLowWarning = false;
    this.muatanLowWarningShown = false;
  }

  confirmMuatanHighWarning() {
    this.showMuatanHighWarning = false;
    this.onSubmit();
  }

  dismissMuatanHighWarning() {
    this.showMuatanHighWarning = false;
    this.muatanHighWarningShown = false;
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
    if (!this.odometerReading) {
      alert('Pembacaan odometer belum diisi. Silakan masukkan angka odometer terlebih dahulu.');
      return;
    }

    if (!this.odometerPhoto || !this.cargoPhoto) {
      alert('Foto odometer dan foto muatan wajib diambil sebelum melanjutkan.');
      return;
    }

    if (!this.jumlahMuatan) {
      alert('Jumlah muatan belum diisi. Silakan masukkan jumlah muatan terlebih dahulu.');
      return;
    }

    // Validate odometer reading
    const odometerValue = parseFloat(this.odometerReading);
    if (isNaN(odometerValue) || odometerValue < 0) {
      alert('Pembacaan odometer tidak valid. Pastikan nilai yang dimasukkan berupa angka positif.');
      return;
    }

    const jumlahMuatanValue = parseFloat(this.jumlahMuatan);
    if (isNaN(jumlahMuatanValue) || jumlahMuatanValue < 0) {
      alert('Jumlah muatan tidak valid. Pastikan nilai yang dimasukkan berupa angka positif.');
      return;
    }

    // Validasi muatan: jika input < sistem, tampilkan warning dulu
    if (this.muatanType === 'CYLINDER' && this.expectedMuatan !== null && jumlahMuatanValue < this.expectedMuatan) {
      if (!this.muatanLowWarningShown) {
        this.showMuatanLowWarning = true;
        this.muatanLowWarningShown = true;
        return;
      }
      this.showMuatanLowWarning = false;
    } else if (this.muatanType === 'CYLINDER' && this.expectedMuatan !== null && jumlahMuatanValue > this.expectedMuatan) {
      if (!this.muatanHighWarningShown) {
        this.showMuatanHighWarning = true;
        this.muatanHighWarningShown = true;
        return;
      }
      this.showMuatanHighWarning = false;
    } else {
      this.showMuatanLowWarning = false;
      this.showMuatanHighWarning = false;
    }

    // Get trip data from localStorage (set by checklist component for OUT trips)
    const savedTripData = localStorage.getItem('tripData');
    const tripNumber = localStorage.getItem('tripNumber') || '';

    let tripData: TripData;

    if (savedTripData && this.tripType === 'OUT') {
      // For OUT trips, use data from checklist
      try {
        tripData = JSON.parse(savedTripData);
        tripData.odometer = odometerValue;
        tripData.note = this.notes || '';
      } catch (e) {
        alert('Gagal membaca data perjalanan. Silakan masukkan data secara manual atau hubungi tim support.');
        return;
      }
    } else {
      // odometer input harus >= odometer dari DB
      if (this.odometerFromDb !== null && odometerValue < this.odometerFromDb) {
        if (!this.odometerWarningShown) {
          this.isOdometerWrong = true;
          this.showOdometerWarning = true;
          this.odometerWarningShown = true;
          return;
        }
        // Submit kedua: lanjut meski ada ketidaksesuaian
        this.showOdometerWarning = false;
      } else {
        this.showOdometerWarning = false;
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
    }

    // Upload foto ke Google Drive via Go backend
    const tripNum = tripData.tripNum || 'unknown';
    this.apiService.uploadPhotos(tripNum, this.odometerPhoto, this.cargoPhoto).subscribe({
      next: () => {},
      error: (err) => {
        this.photoUploadWarning = 'Foto gagal terupload ke Drive. Data perjalanan tetap terkirim.';
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

    // Save to localStorage (in real app, would send to server)
    const existingTrips = JSON.parse(localStorage.getItem('trips') || '[]');
    existingTrips.push(localTripData);
    localStorage.setItem('trips', JSON.stringify(existingTrips));

    // Clean up temporary data
    localStorage.removeItem('currentTruckBarcode');
    localStorage.removeItem('tripType');
    localStorage.removeItem('checklistData');
    localStorage.removeItem('tripData');
    localStorage.removeItem('tripNumber');

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
    this.apiService.sendTripData(tripData).subscribe({
      next: (response) => {
        // For this API, any successful response (even if it has content) is considered success
        // The API might return error details in response body even for 200 status
        if (response && response.error) {
          alert('Kesalahan dari server: ' + (response.message || response.error || JSON.stringify(response)) + '\n\nSilakan masukkan data secara manual atau hubungi tim support.');
        } else {
          alert('Data trip berhasil dikirim ke server!');

          // After successful insert to staging table, process the trip data to Epicor
          this.processDataToEpicor(tripData.tripNum);
        }
      },
      error: (error) => {
        let errorMessage = 'Gagal mengirim data perjalanan.';

        if (error.status === 0) {
          errorMessage += ' Koneksi ke server gagal, periksa jaringan internet Anda.';
        } else if (error.status === 400) {
          errorMessage += ' Data yang dikirim tidak valid.';
        } else if (error.status === 401) {
          errorMessage += ' Sesi telah berakhir, silakan login ulang.';
        } else if (error.status === 403) {
          errorMessage += ' Akses ditolak.';
        } else if (error.status === 404) {
          errorMessage += ' Layanan tidak ditemukan.';
        } else if (error.status === 409) {
          errorMessage += ' Data konflik dengan server.';
        } else if (error.status >= 500) {
          errorMessage += ' Terjadi kesalahan pada server.';
        } else {
          errorMessage += ` HTTP ${error.status}: ${error.statusText}.`;
        }

        alert(errorMessage + '\n\nSilakan masukkan data secara manual atau hubungi tim support.');
      }
    });
  }

  // Function to process trip data to Epicor
  processDataToEpicor(tripNum: string) {
    this.apiService.processTripData(tripNum).subscribe({
      next: (response) => {
        alert('Data berhasil diproses ke sistem Epicor!');
      },
      error: (error) => {
        let errorMessage = 'Gagal memproses data ke sistem Epicor';

        if (error.status === 0) {
          errorMessage += ' - Periksa koneksi internet.';
        } else if (error.status === 400) {
          errorMessage += ' - Data tidak valid untuk proses Epicor.';
        } else if (error.status === 401) {
          errorMessage += ' - Authentication gagal.';
        } else if (error.status === 500) {
          errorMessage += ' - Server error saat proses ke Epicor.';
        } else {
          errorMessage += ` - HTTP ${error.status}: ${error.statusText}`;
        }

        alert(errorMessage + '\n\nData sudah tersimpan di staging table, tapi gagal diproses ke Epicor.');
      }
    });
  }

  goBack() {
    // if (this.tripType === 'OUT') {
    //   this.router.navigate(['/checklist']);
    // } else {
    //   this.router.navigate(['/trip-selection']);
    // }
    this.router.navigate(['/scan-barcode']);
  }

  logout() {
    this.authService.logout();
  }
}
