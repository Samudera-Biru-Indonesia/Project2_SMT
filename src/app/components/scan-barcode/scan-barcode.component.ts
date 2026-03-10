import { Component, OnInit, OnDestroy, ViewChild, ElementRef, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { BrowserMultiFormatReader, Result } from '@zxing/library';
import { BarcodeService } from '../../services/barcode.service';
import { ApiService, TripInfo, Truck } from '../../services/api.service';
import { EnvironmentIndicatorComponent } from '../environment-indicator/environment-indicator.component';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-scan-barcode',
  standalone: true,
  imports: [CommonModule, FormsModule, EnvironmentIndicatorComponent],
  templateUrl: './scan-barcode.component.html',
  styleUrls: ['./scan-barcode.component.css']
})
export class ScanBarcodeComponent implements OnInit, OnDestroy {
  @ViewChild('videoElement', { static: false }) videoElement!: ElementRef<HTMLVideoElement>;
  
  barcodeInput: string = '';
  customerName: string ='';
  manualTruckPlate: string = '';
  newTruckPlate: string = '';
  spkOptions: { tripNumber: string, waktuKeluar: string }[] = [];
  spkOptionsWithData: any[] = [];
  spkDropdownOpen: boolean = false;
  spkSearchQuery: string = '';
  isLoadingSpk: boolean = false;
  tripType: string = '';

  // Truck dropdown properties
  trucks: Truck[] = [];
  truckDropdownOpen: boolean = false;
  truckSearchQuery: string = '';
  trucksLoading: boolean = false;
  isScanning: boolean = false;
  hasCamera: boolean = false;
  cameraError: string = '';
  isLoadingTripData: boolean = false;
  errorMessage: string = '';
  errorTitle: string = '';
  isOthers: boolean = false;
  showConfirmModal: boolean = false;
  pendingSJValue: string = '';
  pendingSJType: 'dropdown' | 'freetext' = 'dropdown';

  private nopolSubject = new Subject<string>();
  private codeReader: BrowserMultiFormatReader;
  private stream: MediaStream | null = null;
  private scanAttemptCount: number = 0;
  private lastDetectedCodes: string[] = [];
  private readonly maxScanAttempts = 5;

  constructor(
    private router: Router,
    private barcodeService: BarcodeService,
    private apiService: ApiService,
    private authService: AuthService
  ) {
    this.codeReader = new BrowserMultiFormatReader();
  }

  ngOnInit() {
    this.loadSavedData();

    this.checkCameraAvailability();
    this.loadTruckList();
    this.tripType = localStorage.getItem('tripType') || '';

    // Debounce nopol input — tunggu 600ms setelah berhenti ketik baru panggil API
    this.nopolSubject.pipe(
      debounceTime(600),
      distinctUntilChanged()
    ).subscribe(nopol => {
      const tripType = localStorage.getItem('tripType');
      this.isOthers = ['LAINNYA', 'RELASI/VENDOR/EKSPEDISI'].includes(nopol);
      // this.barcodeInput = '';
      // this.newTruckPlate = '';

      // IN trip: No SJ needed for special nopols
      if (tripType === 'IN' && this.isOthers) {
        return;
      }

      // OUT trip: LAINNYA doesn't need SJ
      if (tripType === 'OUT' && nopol === 'LAINNYA') {
        return;
      }

      // RELASI and TPF-CONT: Try to get SJ from API
      if (/**(nopol === 'RELASI/VENDOR/EKSPEDISI' && nopol.length >= 3) ||**/ (!this.isOthers && nopol.length >= 3)) {
        this.getAllTripDataFromAPI(nopol);
      } else {
        this.spkOptions = [];
      }
    });
  }

  ngOnDestroy() {
    this.stopScanning();
    this.nopolSubject.complete();
  }

  async checkCameraAvailability() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.hasCamera = devices.some(device => device.kind === 'videoinput');
      
      if (!this.hasCamera) {
        this.cameraError = 'Kamera tidak ditemukan pada perangkat ini';
      }
    } catch (error) {
      this.cameraError = 'Tidak dapat mengakses izin kamera';
      this.hasCamera = false;
    }
  }

  async startScan() {
    if (!this.hasCamera) {
      this.showError('Kamera Tidak Tersedia', 'Kamera tidak tersedia. Silakan gunakan input manual.');
      return;
    }

    try {
      this.isScanning = true;
      this.cameraError = '';
      this.clearError(); // Clear any previous errors
      
      // Reset tracking for new scan session
      this.scanAttemptCount = 0;
      this.lastDetectedCodes = [];

      // Get camera stream with optimized settings for long barcode scanning
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera if available
          width: { ideal: 1920, min: 1280 }, // Higher resolution for long barcodes
          height: { ideal: 1080, min: 720 },
          frameRate: { ideal: 30, min: 15 } // Smooth frame rate
        }
      });

      // Set video stream
      if (this.videoElement?.nativeElement) {
        this.videoElement.nativeElement.srcObject = this.stream;
        
        // Wait for video to be ready
        await new Promise((resolve) => {
          this.videoElement.nativeElement.onloadedmetadata = resolve;
        });
        
        // Start scanning with enhanced detection for long barcodes
        this.codeReader.decodeFromVideoDevice(
          null, // Use default camera
          this.videoElement.nativeElement,
          (result: Result | null, error?: any) => {
            if (result) {
              const detectedText = result.getText().trim();

              // Track detection attempts for consistency
              this.trackDetectedCode(detectedText);

              // Enhanced validation for long barcodes
              if (this.validateDetectedBarcodeEnhanced(detectedText)) {
                this.onBarcodeDetected(detectedText);
              } else {
                // Try to find the most consistent detection if we have multiple attempts
                const consistentCode = this.findConsistentCode();
                if (consistentCode && this.validateDetectedBarcodeEnhanced(consistentCode)) {
                  this.onBarcodeDetected(consistentCode);
                }
              }
            }
          }
        );
      }
    } catch (error) {
      this.cameraError = 'Tidak dapat memulai kamera. Periksa izin dan pencahayaan.';
      this.isScanning = false;
    }
  }

  stopScanning() {
    this.isScanning = false;
    
    // Stop code reader
    this.codeReader.reset();
    
    // Stop camera stream
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    // Clear video element
    if (this.videoElement?.nativeElement) {
      this.videoElement.nativeElement.srcObject = null;
    }
  }

  validateDetectedBarcode(code: string): boolean {
    // Use BarcodeService validation which is more comprehensive
    return this.barcodeService.validateBarcode(code);
  }

  validateDetectedBarcodeEnhanced(code: string): boolean {
    // Enhanced validation with additional checks for long barcodes
    if (!code || code.length < 3) return false;
    
    // Clean the code
    const cleanCode = code.trim().toUpperCase();
    
    // Primary validation using service
    if (this.barcodeService.validateBarcode(cleanCode)) {
      return true;
    }
    
    // Additional checks for edge cases and long barcodes
    // Check for SGI045-00149601 pattern specifically
    if (/^[A-Z]{3}\d{3}-\d{8,}$/i.test(cleanCode)) {
      return true;
    }
    
    // Check for long alphanumeric codes with reasonable length
    if (cleanCode.length >= 8 && cleanCode.length <= 30 && /^[A-Z0-9\-]+$/i.test(cleanCode)) {
      return true;
    }
    
    return false;
  }

  trackDetectedCode(code: string): void {
    if (!code) return;
    
    const cleanCode = code.trim().toUpperCase();
    this.lastDetectedCodes.push(cleanCode);
    this.scanAttemptCount++;
    
    // Keep only recent detections (last 10)
    if (this.lastDetectedCodes.length > 10) {
      this.lastDetectedCodes = this.lastDetectedCodes.slice(-10);
    }
  }

  findConsistentCode(): string | null {
    if (this.lastDetectedCodes.length < 3) return null;
    
    // Count occurrences of each code
    const codeCount: { [key: string]: number } = {};
    this.lastDetectedCodes.forEach(code => {
      codeCount[code] = (codeCount[code] || 0) + 1;
    });
    
    // Find the most frequent code
    let maxCount = 0;
    let mostFrequentCode: string | null = null;
    
    Object.entries(codeCount).forEach(([code, count]) => {
      if (count > maxCount && count >= 2) { // Must appear at least twice
        maxCount = count;
        mostFrequentCode = code;
      }
    });
    
    return mostFrequentCode;
  }

  formatDetectedBarcode(code: string): string {
    // Use BarcodeService formatting
    return this.barcodeService.formatBarcode(code);
  }

  onBarcodeDetected(barcode: string) {
    // Format the barcode
    const formattedBarcode = this.formatDetectedBarcode(barcode);
    this.barcodeInput = formattedBarcode;
    
    // Stop scanning
    this.stopScanning();
    
    // Show success feedback
    this.showScanSuccess();
    
    // Auto-submit after successful scan with small delay
    setTimeout(() => {
      this.onSubmit();
    }, 1500);
  }

  showScanSuccess() {
    // Add visual feedback for successful scan
    const scanFrame = document.querySelector('.scanner-frame');
    if (scanFrame) {
      scanFrame.classList.add('scan-success');
      setTimeout(() => {
        scanFrame.classList.remove('scan-success');
      }, 1500);
    }
  }

  onSubmit() {
    // Save current form data
    localStorage.setItem('savedBarcodeInput', this.barcodeInput);
    localStorage.setItem('savedCustomerName', this.customerName);
    localStorage.setItem('savedManualTruckPlate', this.manualTruckPlate);
    localStorage.setItem('savedNewTruckPlate', this.newTruckPlate);

    
    const tripType = localStorage.getItem('tripType');

    if(this.isOthers) {
      if (!this.customerName.trim()) {
        alert('Pastikan semua kolom sudah terisi.');
        return;
      }

      // Set defaults if data does not exist from the getTripDataFromAPI method
      localStorage.setItem('customerName', this.customerName.trim());
      localStorage.setItem('manualTruckPlate', this.manualTruckPlate.trim());
      localStorage.setItem('newTruckPlate', this.newTruckPlate.trim());
      localStorage.setItem('tripNumber', this.manualTruckPlate);

      localStorage.removeItem('currentTruckBarcode')


      // If SJ is provided, validate and fetch data
      if (this.barcodeInput.trim()) {
        // Set flag for freetext SJ if RELASI/VENDOR/EKSPEDISI with SJ input
        if (this.manualTruckPlate === 'RELASI/VENDOR/EKSPEDISI') {
          localStorage.setItem('isFreetextSJ', 'true');
          localStorage.setItem('freetextSJValue', this.barcodeInput.trim());
        }
        this.getTripDataFromAPI(this.barcodeInput.trim());
        return;
      }



      if (tripType === 'OUT') {
        this.router.navigate(['/checklist']);
      } else {
        this.router.navigate(['/odometer']);
      }
    } else {
      if (this.barcodeInput.trim()){
        localStorage.removeItem('manualTruckPlate')
        localStorage.removeItem('customerName')
        localStorage.removeItem('newTruckPlate')
        this.getTripDataFromAPI(this.barcodeInput.trim());
      } else {
        alert('Nomor SJ belum dipilih.');
      }
    }
  }

  /**
   * Get trip data from API using the scanned/entered code
   */
  getTripDataFromAPI(tripCode: string) {
    this.isLoadingTripData = true;
    this.clearError(); 

    this.apiService.getTripData(tripCode).subscribe({
      next: (tripData: TripInfo) => {
        // Override truckPlate with manual input if provided
        if (this.manualTruckPlate.trim()) {
          tripData = { ...tripData, truckPlate: this.manualTruckPlate.trim().toUpperCase() };
        }

        // Store trip data and barcode in localStorage
        localStorage.setItem('currentTruckBarcode', tripCode);
        // FYI INI CATETAN DARI VERSI SEBELUMNYA IDK: Use the truck barcode as trip number (surat jalan) instead of generating new one
        localStorage.setItem('tripNumber', tripCode);
        localStorage.setItem('currentTripData', JSON.stringify(tripData));
        
        this.isLoadingTripData = false;
        
        // Navigate to trip selection page with trip data
        const type = localStorage.getItem('tripType');

        if (type === 'OUT') {
          // For OUT trips, go to checklist
          this.router.navigate(['/checklist']);
        } else {
          // For IN trips, go directly to odometer
          this.router.navigate(['/odometer']);
        }
      },
      error: (error) => {

        this.isLoadingTripData = false;

        if (error.status === 400) {
          // Store trip data and barcode in localStorage
          localStorage.setItem('currentTruckBarcode', tripCode);
          // FYI INI CATETAN DARI VERSI SEBELUMNYA IDK: Use the truck barcode as trip number (surat jalan) instead of generating new one
          localStorage.setItem('tripNumber', tripCode);

          const type = localStorage.getItem('tripType');

          if (type === 'OUT') {
            // For OUT trips, go to checklist
            this.router.navigate(['/checklist']);
          } else {
            // For IN trips, go directly to odometer
            this.router.navigate(['/odometer']);
          }

        } else {

          // Show user-friendly error messages based on error type
          this.handleApiError(error);
        }
        
      }
    });
  }


  // setNopol

  onNopolChange(value: string) {
    this.manualTruckPlate = value.toUpperCase();
    this.nopolSubject.next(this.manualTruckPlate);
  }

  getAllTripDataFromAPI(nopol: string) {
    this.isLoadingSpk = true;
    this.spkOptions = [];
    this.barcodeInput = '';
    this.clearError();

    this.apiService.getAllTripData(nopol).subscribe({
      next: (response: any) => {
        // Response: { TripData: { Result: [ { tripNumber: "..." }, ... ] } }
        const trips: any[] = response?.TripData?.Result ?? [];
        const tripType = localStorage.getItem('tripType');

        if (tripType === 'IN') {
          this.apiService.getOutTruckCheck().subscribe({
            next: (response: any) => {
              const tripOut: any[] = response?.TruckCheckData?.Result ?? [];
              const tripOutSet = new Set(tripOut.map((t: any) => t.TripNum));

              this.spkOptions = trips
                .filter((t: any) => {
                    const num = t.tripNumber ?? '';
                    return num.length > 0 && tripOutSet.has(num);
                })
                // 2. MAP TO A NEW OBJECT (keeping both properties)
                .map((t: any) => {
                    return {
                        tripNumber: t.tripNumber,
                        waktuKeluar: t.waktuKeluar
                    };
                });
                

              if (this.spkOptions.length === 1) {
                this.barcodeInput = this.spkOptions[0].tripNumber;
              } else {
                this.loadSavedBarcodeIfExists();
              }

              this.isLoadingSpk = false;
            },
            error: (error) => {
              this.isLoadingSpk = false;
              this.handleApiError(error);
            }
          });
        } else {
          this.spkOptions = trips
            .map((t: any) => t.tripNumber ?? '')
            .filter((tripNum: string) => tripNum.length > 0);

          if (this.spkOptions.length === 1) {
            this.barcodeInput = this.spkOptions[0].tripNumber;
          } else {
            this.loadSavedBarcodeIfExists();
          }

          this.isLoadingSpk = false;
        }
      },
      error: (error) => {
        this.isLoadingSpk = false;
        this.handleApiError(error);
      }
    });
  }


  /**
   * Handle API errors with user-friendly messages
   */
  handleApiError(error: any) {
    if (error.status === 400) {
      this.showError('NomorJ SJ Tidak Valid', 'Nomor SJ yang dimasukkan tidak valid atau tidak ditemukan. Silakan periksa kembali barcode kendaraan.');
    } else if (error.status === 404) {
      this.showError('Nomor SJ Tidak Ditemukan', 'Nomor SJ tidak ditemukan dalam sistem. Pastikan barcode yang Anda scan atau input sudah benar.');
    } else if (error.status === 0) {
      this.showError('Koneksi Bermasalah', 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda dan coba lagi.');
    } else if (error.status === 401) {
      this.showError('Autentikasi Gagal', 'Sesi Anda telah berakhir. Silakan login kembali.');
    } else if (error.status === 403) {
      this.showError('Akses Ditolak', 'Anda tidak memiliki izin untuk mengakses data ini. Hubungi administrator.');
    } else if (error.status >= 500) {
      this.showError('Kesalahan Server', 'Terjadi kesalahan pada server. Silakan coba lagi dalam beberapa saat.');
    } else {
      this.showError('Nomor SJ Tidak Ditemukan', `Nomor SJ tidak ditemukan atau tidak valid. Silakan periksa kembali barcode kendaraan.`);
    }
  }

  /**
   * Show error message to user
   */
  showError(title: string, message: string) {
    this.errorTitle = title;
    this.errorMessage = message;
  }

  /**
   * Clear error message
   */
  clearError() {
    this.errorMessage = '';
    this.errorTitle = '';
  }

  goBack() {
    this.stopScanning();
    this.router.navigate(['/trip-selection']);
  }

  logout() {
    this.authService.logout();
  }

  onBarcodeInputChange() {
    localStorage.removeItem('checklistData');
    localStorage.removeItem('odometerData');
    localStorage.removeItem('savedBarcodeInput');
    localStorage.removeItem('savedCustomerName');
    localStorage.removeItem('savedManualTruckPlate');
    localStorage.removeItem('savedNewTruckPlate');
    localStorage.removeItem('isFreetextSJ');
    localStorage.removeItem('freetextSJValue');
    // Clear input as user types for better validation
    if (this.barcodeInput) {
      // Remove any unwanted characters and normalize
      this.barcodeInput = this.barcodeInput.trim().toUpperCase();
    }
    
    // Clear any error messages when user starts typing
    this.clearError();
  }

  isValidBarcodeInput(): boolean {
    if (!this.barcodeInput || !this.barcodeInput.trim()) {
      return false;
    }

    return true;
    // return this.validateDetectedBarcodeEnhanced(this.barcodeInput.trim());
  }

  get filteredSpkOptions(): any[] {
    if (!this.spkSearchQuery.trim()) return this.spkOptions;
    const q = this.spkSearchQuery.trim().toUpperCase();
    return this.spkOptions.filter(s => s.tripNumber.toUpperCase().includes(q));
  }

  toggleSpkDropdown() {
    this.spkDropdownOpen = !this.spkDropdownOpen;
    if (this.spkDropdownOpen) this.spkSearchQuery = '';
  }

  selectSpk(spk: string) {
    if (this.hasExistingData()) {
      this.pendingSJValue = spk;
      this.pendingSJType = 'dropdown';
      this.showConfirmModal = true;
      return;
    }
    this.applySJChange(spk, 'dropdown');
  }

  loadTruckList() {
    this.trucksLoading = true;
    const tripType = localStorage.getItem('tripType') || '';
    this.apiService.getTruckList(tripType).subscribe({
      next: (response) => {
        this.trucks = response.TruckData?.Result ?? [];

        // this.trucks.push({
        //   truckPlate: 'LAINNYA', 
        //   truckDesc: 'Input Nopol Manual'
        // } as Truck);

        this.trucksLoading = false;
      },
      error: () => {
        this.trucks = [];
        this.trucksLoading = false;
      }
    });
  }

  get filteredTruckOptions(): Truck[] {
    if (!this.truckSearchQuery.trim()) return this.trucks;
    const q = this.truckSearchQuery.trim().toUpperCase();
    return this.trucks.filter(t =>
      t.truckPlate.toUpperCase().includes(q) ||
      (t.truckDesc && t.truckDesc.toUpperCase().includes(q))
    );
  }

  toggleTruckDropdown() {
    this.truckDropdownOpen = !this.truckDropdownOpen;
    if (this.truckDropdownOpen) this.truckSearchQuery = '';
  }

  selectTruck(truck: Truck) {
    const plate = truck.truckPlate || truck.truckID.toUpperCase();
    this.manualTruckPlate = plate;
    console.log('manual truck plate' + this.manualTruckPlate)
    this.truckDropdownOpen = false;
    this.truckSearchQuery = '';
    
    this.onNopolChange(plate);
  }

  getDisplayName(plate: string): string {
    if (plate === 'TPF-CONT') return 'Vendor';
    return plate;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.spk-custom-dropdown')) {
      this.spkDropdownOpen = false;
    }
    if (!target.closest('.nopol-custom-dropdown')) {
      this.truckDropdownOpen = false;
    }
  }

  onOthersNopolType(value: string) {
    localStorage.setItem('savedNewTruckPlate', value.toUpperCase());
    this.newTruckPlate = value.toUpperCase();
  }

  isValidIndonesianPlate(plate: string): boolean {
    if (!plate || !plate.trim()) return false;
    // Indonesian plate format: 1-2 letters + 1-4 digits + 1-3 letters
    // Examples: B1234ABC, AB123CD, D456E
    const plateRegex = /^[A-Z]{1,2}\s?\d{1,4}\s?[A-Z]{1,3}$/;
    return plateRegex.test(plate.trim().toUpperCase());
  }

  onCustomerName(value: string) {
    localStorage.setItem('savedCustomerName', value.toUpperCase());
    this.customerName = value.toUpperCase();
  }

  formatWaktuKeluar(waktuKeluar: string): string {
    if (!waktuKeluar || waktuKeluar === '0001-01-01T00:00:00') return '';
    try {
      const date = new Date(waktuKeluar);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch {
      return '';
    }
  }

  getSpkDataByNumber(tripNumber: string): any {
    console.log(this.filteredSpkOptions)
    return this.spkOptionsWithData.find(spk => spk.tripNumber === tripNumber);
  }

  loadSavedData() {
    this.barcodeInput = localStorage.getItem('savedBarcodeInput') || '';
    this.customerName = localStorage.getItem('savedCustomerName') || '';
    this.manualTruckPlate = localStorage.getItem('savedManualTruckPlate') || '';
    this.newTruckPlate = localStorage.getItem('savedNewTruckPlate') || '';
    
    // Trigger SJ dropdown loading if nopol exists
    if (this.manualTruckPlate) {
      setTimeout(() => {
        this.onNopolChange(this.manualTruckPlate);
      }, 100);
    }
  }

  loadSavedBarcodeIfExists() {
    const savedBarcode = localStorage.getItem('savedBarcodeInput');
    if (savedBarcode && this.spkOptions.some(option => 
      typeof option === 'string' ? option === savedBarcode : option.tripNumber === savedBarcode
    )) {
      this.barcodeInput = savedBarcode;
    }
  }

  getSubmitDisabledMessage(): string {
    if (this.isLoadingTripData) return 'Sedang memuat data...';
    if (this.isOthers) {
      if (!this.customerName.trim()) return 'Nama perusahaan belum diisi';
      if (!this.isValidIndonesianPlate(this.newTruckPlate)) return 'Format plat nomor tidak valid';
    } else {
      if (this.manualTruckPlate !== 'LAINNYA' && this.manualTruckPlate !== 'RELASI/VENDOR/EKSPEDISI' && !this.barcodeInput.trim()) {
        return 'Nomor SJ belum dipilih';
      }
    }
    return 'Form belum lengkap';
  }

  onButtonClick(event: Event): boolean {
    const button = event.target as HTMLButtonElement;
    const isDisabled = this.isLoadingTripData || (this.isOthers && (!this.customerName.trim() || !this.isValidIndonesianPlate(this.newTruckPlate))) || (!this.isOthers && this.manualTruckPlate !== 'LAINNYA' && this.manualTruckPlate !== 'RELASI/VENDOR/EKSPEDISI' && !this.barcodeInput.trim());
    
    if (isDisabled) {
      event.preventDefault();
      event.stopPropagation();
      alert(this.getSubmitDisabledMessage());
      return false;
    }
    return true;
  }

  onFreetextSJChange(value: string) {
    if (this.hasExistingData()) {
      this.pendingSJValue = value;
      this.pendingSJType = 'freetext';
      this.showConfirmModal = true;
      return;
    }
    this.applySJChange(value, 'freetext');
  }

  hasExistingData(): boolean {
    return !!(localStorage.getItem('checklistData') || localStorage.getItem('odometerData'));
  }

  applySJChange(value: string, type: 'dropdown' | 'freetext') {
    localStorage.removeItem('checklistData');
    localStorage.removeItem('odometerData');
    localStorage.removeItem('savedBarcodeInput');
    localStorage.removeItem('savedCustomerName');
    localStorage.removeItem('savedManualTruckPlate');
    localStorage.removeItem('savedNewTruckPlate');
    localStorage.removeItem('isFreetextSJ');
    localStorage.removeItem('freetextSJValue');
    
    this.barcodeInput = value;
    
    if (type === 'dropdown') {
      this.spkDropdownOpen = false;
      this.spkSearchQuery = '';
    }
    
    this.clearError();
  }

  confirmSJChange() {
    this.applySJChange(this.pendingSJValue, this.pendingSJType);
    this.showConfirmModal = false;
    this.pendingSJValue = '';
  }

  cancelSJChange() {
    this.showConfirmModal = false;
    this.pendingSJValue = '';
    
    if (this.pendingSJType === 'freetext') {
      const savedValue = localStorage.getItem('savedBarcodeInput') || '';
      this.barcodeInput = savedValue;
    }
  }
}
