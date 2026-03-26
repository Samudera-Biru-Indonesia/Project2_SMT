import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, TripData, GetOutTruckCheckResponse, GetOrderDetailsResponse, OrderDetail } from '../../services/api.service';
import { debounceTime, distinctUntilChanged, Subject, timeout } from 'rxjs';
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
  odometerPhotos: string[] = [];
  cargoPhotos: string[] = [];
  carPhotos: string[] = [];
  isUploading: boolean = false;
  photoUploadWarning: string = '';
  tripDriver: string = '';
  expectedMuatan: number | null = null;
  muatanType: string = '';
  orderDetails: OrderDetail[] = [];
  isOdometerWrong: boolean = false;
  manualTruckPlate: string = '';
  customerName: string = '';
  newTruckPlate: string = '';
  odometerTooLargeWarning: boolean = false;

  get odometerMismatchWarning(): boolean {
    if (this.tripType !== 'IN' || this.odometerFromDb === null || (this.odometerReading === null || this.odometerReading === undefined || this.odometerReading === '')) return false;
    const entered = parseFloat(this.odometerReading);
    return !isNaN(entered) && entered < this.odometerFromDb;
  }

  get muatanMismatchWarning(): boolean {
    if (this.muatanType !== 'CYLINDER' || this.expectedMuatan === null || this.expectedMuatan <= 0 || (this.jumlahMuatan === null || this.jumlahMuatan === undefined || this.jumlahMuatan === '')) return false;
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
  showSummaryModal: boolean = false;
  showOdometerTooLargeWarning: boolean = false;

  constructor(private router: Router, private apiService: ApiService, private authService: AuthService) {}

  ngOnInit() {

    this.isUploading = false;

    localStorage.removeItem('tripSummary');
    
    this.loadSavedOdometerData();
    this.truckBarcode = localStorage.getItem('currentTruckBarcode') || '';
    this.tripType = localStorage.getItem('tripType') || '';
    this.tripNumber = localStorage.getItem('tripNumber') || '';
    this.tripDriver = localStorage.getItem('tripDriver') || '';
    this.manualTruckPlate = localStorage.getItem('manualTruckPlate') || '';
    this.customerName = localStorage.getItem('customerName') || '';
    this.newTruckPlate = localStorage.getItem('newTruckPlate') || '';

    if (this.tripNumber) {
      if (this.tripType === 'OUT') {
        this.fetchOrderDetails(this.tripNumber);
      } else { // kalok IN
        this.fetchOdometer();
      }
    } else {
      alert('Silahkan memulai perjalanan baru.');
      this.router.navigate(['/trip-selection']);
    }

    // Get plate number from trip data if available
    if (this.manualTruckPlate === 'LAINNYA' || this.manualTruckPlate === 'GROUP/RELASI/VENDOR/EKSPEDISI') {
      this.plateNumber = this.newTruckPlate || '-';
    } else {
      const tripDataString = localStorage.getItem('currentTripData');
      if (tripDataString) {
        try {
          const tripData = JSON.parse(tripDataString);
          this.plateNumber = tripData?.truckPlate || '-';
          this.tripDriver = tripData?.driver || '-';
        } catch (error) {
          this.plateNumber = '-';
          this.tripDriver = '-';
        }
      } else {
        this.plateNumber = '-';
        this.tripDriver = '-';
      }
    }



    const isBarcodeExempt = 
      this.manualTruckPlate === 'LAINNYA' || 
      // this.manualTruckPlate === 'RELASI' || 
      // this.manualTruckPlate === 'TPF-CONT';
      this.manualTruckPlate === 'GROUP/RELASI/VENDOR/EKSPEDISI';


      console.log('Current trip type:', this.tripType);
      console.log('Is barcode exempt:', isBarcodeExempt);
      console.log('Manual truck plate:', this.manualTruckPlate);
      console.log('Current truck barcode:', this.truckBarcode);
    if (!this.tripType || (!isBarcodeExempt && !this.truckBarcode)) {
      console.log('manual truck plate:' + this.manualTruckPlate)
      console.log('truck barcode/SJ' + this.truckBarcode)

      this.router.navigate(['/trip-selection']);
      
    }

  }

  fetchOrderDetails(tripNumberStr: string) {
    this.isLoading = true;
    const company = localStorage.getItem('currentCompany') || '';
    const plant = localStorage.getItem('currentPlant') || '';
    const sjNumber ='';
    // const sjNumber = localStorage.getItem('isFreetextSJ') === 'true' ? localStorage.getItem('freetextSJValue') || '' : '';

    this.apiService.getOrderDetails(company, plant, tripNumberStr, sjNumber)
      .pipe(timeout(30000))
      .subscribe({
        next: (response: GetOrderDetailsResponse) => {
          this.isLoading = false;
          this.orderDetails = response.OrderData?.Result || [];
          this.muatanType = response.Type || '';
          this.expectedMuatan = response.TotalQty ?? null;
          this.tripLoadFromDb = response.TotalQty ?? null;
          this.productType = response.Type || '';
        },
        error: (err) => {
          this.isLoading = false;
          if (err.name === 'TimeoutError') {
            alert('Koneksi ke server lambat, data order tidak dapat dimuat. Anda tetap dapat melanjutkan pengisian.');
          } else {
            // alert('Error connecting to server.');
          }
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
          } else if (!(this.manualTruckPlate === 'GROUP/RELASI/VENDOR/EKSPEDISI' || this.manualTruckPlate === 'LAINNYA')) {
            alert('Gagal mengambil data odometer, gunakan surat jalan sebagai referensi odometer.');
          }
        },
        error: (error) => {
          this.isLoading = false;
          alert('Error connecting to server.');
        },
      });
  }

  onNotesChange() {
    this.saveOdometerData();
  }

  onOdometerChange() {
    this.saveOdometerData();
    this.showOdometerWarning = false;
    this.odometerWarningShown = false;
  }

  onOdometerInput() {
    const odometerNumb = parseFloat(this.odometerReading);
    console.log('odometerNumb' + odometerNumb);
    if (odometerNumb && odometerNumb > 9999999) {
      this.odometerTooLargeWarning = true;
    } else {
      this.odometerTooLargeWarning = false;
    }
    this.saveOdometerData();
  }

  onMuatanChange() {
    this.saveOdometerData();
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

  dismissOdometerTooLargeWarning() {
    this.showOdometerTooLargeWarning = false;
  }

  onPhotoSelected(event: Event, type: 'odometer' | 'cargo' | 'car') {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    Array.from(input.files).forEach(file => {
      const reader = new FileReader();

      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxSize = 800;
          let width = img.width;
          let height = img.height;

          // Resize logic
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
            this.odometerPhotos.push(compressed);
          } else if (type === 'cargo') {
            this.cargoPhotos.push(compressed);
          } else {
            this.carPhotos.push(compressed);
          }
          this.saveOdometerData();
        };
        img.src = reader.result as string;
      };

      reader.readAsDataURL(file);
    });
    input.value = '';
  }

  removePhoto(type: 'odometer' | 'cargo' | 'car', index: number) {
    if (type === 'odometer') {
      this.odometerPhotos.splice(index, 1);
    } else if (type === 'cargo') {
      this.cargoPhotos.splice(index, 1);
    } else {
      this.carPhotos.splice(index, 1);
    }
    this.saveOdometerData();
  }

  onSubmit() {
    const isSpecialTruck = ['LAINNYA', 'GROUP/RELASI/VENDOR/EKSPEDISI'].includes(this.manualTruckPlate);

    // Validation for regular trucks
    if (!isSpecialTruck) {
      if (this.odometerReading === null || this.odometerReading === undefined || this.odometerReading === '') {
        alert('Pembacaan odometer belum diisi. Silakan masukkan angka odometer terlebih dahulu.');
        return;
      }

      const odometerValue = parseFloat(this.odometerReading);
      if (isNaN(odometerValue) || odometerValue < 0) {
        alert('Pembacaan odometer tidak valid. Pastikan nilai yang dimasukkan berupa angka positif.');
        return;
      }

      const roundedOdometer = Math.floor(odometerValue);
      if (roundedOdometer > 9999999) {
        this.showOdometerTooLargeWarning = true;
        return;
      }

      if (this.odometerPhotos.length === 0) {
        alert('Foto odometer wajib diambil sebelum melanjutkan.');
        return;
      }

      if (this.cargoPhotos.length === 0) {
        alert('Foto muatan wajib diambil sebelum melanjutkan.');
        return;
      }

      if (this.jumlahMuatan === null || this.jumlahMuatan === undefined || this.jumlahMuatan === '') {
        alert('Jumlah muatan belum diisi. Silakan masukkan jumlah muatan terlebih dahulu.');
        return;
      }

      const jumlahMuatanValue = parseFloat(this.jumlahMuatan);
      if (isNaN(jumlahMuatanValue) || jumlahMuatanValue < 0) {
        alert('Jumlah muatan tidak valid. Pastikan nilai yang dimasukkan berupa angka positif.');
        return;
      }

      if (this.muatanMismatchWarning && !this.notes.trim()) {
        alert('Catatan wajib diisi karena jumlah muatan berbeda dari sistem.');
        return;
      }

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

      if (this.odometerFromDb !== null && odometerValue < this.odometerFromDb) {
        if (!this.odometerWarningShown) {
          this.isOdometerWrong = true;
          this.showOdometerWarning = true;
          this.odometerWarningShown = true;
          return;
        }
        this.showOdometerWarning = false;
      } else {
        this.showOdometerWarning = false;
      }
    }

    // Validation for GROUP/RELASI/VENDOR/EKSPEDISI (masuk/keluar): jumlah muatan + foto muatan
    if (this.manualTruckPlate === 'GROUP/RELASI/VENDOR/EKSPEDISI') {
      if (this.jumlahMuatan === null || this.jumlahMuatan === undefined || this.jumlahMuatan === '') {
        alert('Jumlah muatan belum diisi.');
        return;
      }
      
      // Check for photos in cargoPhotos array (single input field for both IN/OUT)
      if (this.cargoPhotos.length === 0) {
        alert('Foto muatan & mobil wajib diambil sebelum melanjutkan.');
        return;
      }

      const jumlahMuatanValue = parseFloat(this.jumlahMuatan);
      if (isNaN(jumlahMuatanValue) || jumlahMuatanValue < 0) {
        alert('Jumlah muatan tidak valid. Pastikan nilai yang dimasukkan berupa angka positif.');
        return;
      }

      if (this.tripType === 'OUT' && this.muatanMismatchWarning && !this.notes.trim()) {
        alert('Catatan wajib diisi karena jumlah muatan berbeda dari sistem.');
        return;
      }

      // Show muatan mismatch modals for GROUP/RELASI/VENDOR/EKSPEDISI
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
      }
    }

    // Validation for LAINNYA (masuk/keluar): foto mobil
    if (this.manualTruckPlate === 'LAINNYA') {
      if (this.carPhotos.length === 0) {
        alert('Foto mobil wajib diambil sebelum melanjutkan.');
        return;
      }
    }

    // Validation for VENDOR (keluar): jumlah muatan + foto muatan & mobil
    // if (this.manualTruckPlate === 'GROUP/RELASI/VENDOR/EKSPEDISI' && this.tripType === 'OUT') {
    //   if (this.jumlahMuatan === null || this.jumlahMuatan === undefined || this.jumlahMuatan === '') {
    //     alert('Jumlah muatan belum diisi.');
    //     return;
    //   }
    //   if (this.cargoPhotos.length === 0) {
    //     alert('Foto mobil & muatan wajib diambil sebelum melanjutkan.');
    //     return;
    //   }
      
    //   // Check notes requirement for mismatch
    //   if (this.muatanMismatchWarning && !this.notes.trim()) {
    //     alert('Catatan wajib diisi karena jumlah muatan berbeda dari sistem.');
    //     return;
    //   }
    // }

    // Validation for VENDOR (masuk): foto mobil
    // if (this.manualTruckPlate === 'TPF-CONT' && this.tripType === 'IN') {
    //   if (this.carPhotos.length === 0) {
    //     alert('Foto mobil wajib diambil sebelum melanjutkan.');
    //     return;
    //   }
    // }

    // Proceed to final submission
    this.finalSubmit();
  }

  finalSubmit() {

    // Get trip data from localStorage (set by checklist component for OUT trips)
    const savedTripData = localStorage.getItem('tripData');
    const tripNumber = localStorage.getItem('tripNumber') || '';
    const authUser = JSON.parse(localStorage.getItem('smt_auth_user') || '{}');
    const currentCompany = localStorage.getItem('currentCompany') || '';
    const currentPlant = localStorage.getItem('currentPlant') || '';

    let tripData: TripData;
    const odometerValue = this.odometerReading ? parseFloat(this.odometerReading) : 0;
    const jumlahMuatanValue = this.jumlahMuatan ? parseFloat(this.jumlahMuatan) : 0;

    if (savedTripData && this.tripType === 'OUT') {
      // For OUT trips, use data from checklist
      try {
        tripData = JSON.parse(savedTripData);
        tripData.odometer = odometerValue;
        tripData.note = this.notes || '';
        tripData.jumlahMuatan = jumlahMuatanValue;

        if(this.newTruckPlate) {
          tripData.manualTruckPlate = this.newTruckPlate || '';
        } else {
          tripData.manualTruckPlate = this.manualTruckPlate || '';
        }
        
        tripData.companyName = this.customerName || '';
        tripData.fullName = authUser.fullName || '';
        tripData.empCode = authUser.empCode || '';
        tripData.expectedMuatan = this.expectedMuatan || 0;
        tripData.company = currentCompany;
        tripData.site = currentPlant;
      } catch (e) {
        alert('Gagal membaca data perjalanan. Silakan masukkan data secara manual atau hubungi tim support.');
        return;
      }
    } else {
      // For IN trips or if no saved data, create new trip data
      tripData = {
        odometer: odometerValue,
        type: this.tripType,
        chk1: false,
        chk2: false,
        tripNum: tripNumber,
        note: this.notes || '',
        tripDriver: this.tripDriver || '',
        jumlahMuatan: jumlahMuatanValue,
        manualTruckPlate: this.newTruckPlate || this.manualTruckPlate || '',
        companyName: this.customerName || '',
        fullName: authUser.fullName || '',
        empCode: authUser.empCode || '',
        expectedMuatan: this.expectedMuatan || 0,
        company: currentCompany,
        site: currentPlant
      };
    }

    // Upload photos first to get timestamp
    const tripNum = tripData.tripNum || 'unknown';
    const truckType = this.manualTruckPlate || '';
    const siteCode = currentPlant || '';
    this.isUploading = true;
    this.apiService.uploadPhotos(tripNum, this.odometerPhotos, this.cargoPhotos, this.carPhotos, this.tripType, truckType, siteCode).subscribe({
      next: (response) => {
        this.isUploading = false;
        // Add timestamp to tripData
        if (response.timestamp) {
          tripData.photoTimestamp = response.timestamp;
          localStorage.setItem('photoTimestamp', response.timestamp);
        }
        // Send data to API with timestamp
        this.sendTripDataToAPI(tripData, () => {
          this.continueAfterUpload(tripData, odometerValue, jumlahMuatanValue, authUser);
        });
      },
      error: (err) => {
        this.isUploading = false;
        this.photoUploadWarning = 'Foto gagal terupload ke Drive. Harap coba lagi.';
        // Continue without timestamp
        this.sendTripDataToAPI(tripData, () => {
          this.continueAfterUpload(tripData, odometerValue, jumlahMuatanValue, authUser);
        });
      }
    });
  }

  continueAfterUpload(tripData: TripData, odometerValue: number, jumlahMuatanValue: number, authUser: any) {
    // 3. Save to Local Storage
    const localTripData = {
      truckBarcode: this.truckBarcode,
      tripType: this.tripType,
      odometerReading: this.odometerReading,
      notes: this.notes,
      odometerPhotos: this.odometerPhotos,
      cargoPhotos: this.cargoPhotos,
      timestamp: new Date().toISOString(),
      checklistData: this.tripType === 'OUT' ? localStorage.getItem('checklistData') : null
    };

    const existingTrips = JSON.parse(localStorage.getItem('trips') || '[]');
    existingTrips.push(localTripData);
    localStorage.setItem('trips', JSON.stringify(existingTrips));

    // 4. Save summary data for trip-complete page
    const hasNotesField = this.manualTruckPlate !== 'LAINNYA' && 
                          !(this.manualTruckPlate === 'GROUP/RELASI/VENDOR/EKSPEDISI' && this.tripType === 'IN');
    const hasOdometerField = this.manualTruckPlate !== 'LAINNYA' && this.manualTruckPlate !== 'GROUP/RELASI/VENDOR/EKSPEDISI';
    const hasMuatanField = this.manualTruckPlate !== 'LAINNYA';
    const hasDriverField = this.manualTruckPlate !== 'LAINNYA' && this.manualTruckPlate !== 'GROUP/RELASI/VENDOR/EKSPEDISI';
    const hasCustomerName = this.manualTruckPlate === 'LAINNYA' || this.manualTruckPlate === 'GROUP/RELASI/VENDOR/EKSPEDISI';
    const hasTripNumber = this.tripNumber && this.tripNumber !== '-';
    
    const summaryData = {
      tripNumber: hasTripNumber ? tripData.tripNum : null,
      tripDriver: hasDriverField ? (this.tripDriver || '-') : null,
      jumlahMuatan: hasMuatanField ? (jumlahMuatanValue || 0) : null,
      odometer: hasOdometerField ? (odometerValue || 0) : null,
      fullName: authUser.fullName || '',
      empCode: authUser.empCode || '',
      tripType: this.tripType,
      plateNumber: this.plateNumber || this.newTruckPlate || '',
      customerName: hasCustomerName ? this.customerName : null,
      notes: hasNotesField ? (this.notes || '-') : null,
      photoTimestamp: localStorage.getItem('photoTimestamp') || null,
      odometerPhotos: this.odometerPhotos || [],
      cargoPhotos: this.cargoPhotos || [],
      carPhotos: this.carPhotos || []
    };
    localStorage.setItem('tripSummary', JSON.stringify(summaryData));

    // 5. Navigate
    this.router.navigate(['/trip-complete']).then(() => {
      // alert('Data trip berhasil dikirim ke server dan diproses ke Epicor!');
    });
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
  sendTripDataToAPI(tripData: TripData, onSuccess: () => void) {
    this.isUploading = true;
    this.apiService.sendTripData(tripData).subscribe({
      next: (response) => {
        if (response && response.error) {
          alert('Kesalahan dari server: ' + (response.message || response.error || JSON.stringify(response)) + '\n\nSilakan masukkan data secara manual atau hubungi tim support.');
        } else {
          
          const company = localStorage.getItem('currentCompany') || ''

          this.processDataToEpicor(/*tripData.tripNum*/ company).subscribe({
            next: (epicorResponse) => {
                // 3. EPICOR SUCCESS!
                onSuccess(); // Navigate away
            },
            error: (error) => {
                // 4. EPICOR FAILED (Your Error Logic Goes Here!)
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

                alert(errorMessage + '\n\nData gagal disimpan ke sistem.');
                
            }
          });
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
  processDataToEpicor(company: string) {
    return this.apiService.processTripData(company); 
    // this.apiService.processTripData(tripNum).subscribe({
    //   next: (response) => {
    //     // alert('Data berhasil diproses ke sistem Epicor!');
    //   },
    //   error: (error) => {
    //     let errorMessage = 'Gagal memproses data ke sistem Epicor';

    //     if (error.status === 0) {
    //       errorMessage += ' - Periksa koneksi internet.';
    //     } else if (error.status === 400) {
    //       errorMessage += ' - Data tidak valid untuk proses Epicor.';
    //     } else if (error.status === 401) {
    //       errorMessage += ' - Authentication gagal.';
    //     } else if (error.status === 500) {
    //       errorMessage += ' - Server error saat proses ke Epicor.';
    //     } else {
    //       errorMessage += ` - HTTP ${error.status}: ${error.statusText}`;
    //     }

    //     alert(errorMessage + '\n\nData sudah tersimpan di staging table, tapi gagal diproses ke Epicor.');
    //   }
    // });
  }

  goBack() {

    if (this.tripType === 'OUT') {
      if (this.manualTruckPlate === 'LAINNYA') {
        this.router.navigate(['/scan-barcode']);
      } else {
        this.router.navigate(['/checklist']);
      }
      
    } else {
      this.router.navigate(['/scan-barcode']);
    }
    
  }

  logout() {
    this.authService.logout();
  }

  getAuthUser() {
    try {
      return JSON.parse(localStorage.getItem('smt_auth_user') || '{}');
    } catch {
      return {};
    }
  }

  loadSavedOdometerData() {
    const savedData = localStorage.getItem('odometerData');
    if (savedData) {
      try {
        const data = JSON.parse(savedData);
        this.odometerReading = data.odometerReading || '';
        this.jumlahMuatan = data.jumlahMuatan || '';
        this.notes = data.notes || '';
        this.odometerPhotos = data.odometerPhotos || [];
        this.cargoPhotos = data.cargoPhotos || [];
        this.carPhotos = data.carPhotos || [];
      } catch (error) {
        console.error('Error loading odometer data:', error);
      }
    }
  }

  saveOdometerData() {
    const data = {
      odometerReading: this.odometerReading,
      jumlahMuatan: this.jumlahMuatan,
      notes: this.notes,
      odometerPhotos: this.odometerPhotos,
      cargoPhotos: this.cargoPhotos,
      carPhotos: this.carPhotos
    };
    localStorage.setItem('odometerData', JSON.stringify(data));
  }

  preventDecimals(event: KeyboardEvent) {
    // Block period, comma, exponential 'e', plus, and minus signs
    if (['.', ',', 'e', 'E', '+', '-'].includes(event.key)) {
      event.preventDefault();
    }
  }
}
