import { Component, OnInit, OnDestroy, ViewChild, ElementRef, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { BrowserMultiFormatReader, Result } from '@zxing/library';
import { BarcodeService } from '../../services/barcode.service';
import { ApiService, TripInfo } from '../../services/api.service';
import { EnvironmentIndicatorComponent } from '../environment-indicator/environment-indicator.component';

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
  manualTruckPlate: string = '';
  spkOptions: string[] = [];
  spkDropdownOpen: boolean = false;
  spkSearchQuery: string = '';
  isLoadingSpk: boolean = false;
  isScanning: boolean = false;
  hasCamera: boolean = false;
  cameraError: string = '';
  isLoadingTripData: boolean = false;
  errorMessage: string = '';
  errorTitle: string = '';

  private nopolSubject = new Subject<string>();
  private codeReader: BrowserMultiFormatReader;
  private stream: MediaStream | null = null;
  private scanAttemptCount: number = 0;
  private lastDetectedCodes: string[] = [];
  private readonly maxScanAttempts = 5;

  constructor(
    private router: Router,
    private barcodeService: BarcodeService,
    private apiService: ApiService
  ) {
    this.codeReader = new BrowserMultiFormatReader();
  }

  ngOnInit() {
    this.checkCameraAvailability();

    // Debounce nopol input — tunggu 600ms setelah berhenti ketik baru panggil API
    this.nopolSubject.pipe(
      debounceTime(600),
      distinctUntilChanged()
    ).subscribe(nopol => {
      if (nopol.length >= 4) {
        this.getAllTripDataFromAPI(nopol);
      } else {
        this.spkOptions = [];
        this.barcodeInput = '';
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
      console.error('Error checking camera:', error);
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
              console.log('Raw barcode detected:', detectedText);
              
              // Track detection attempts for consistency
              this.trackDetectedCode(detectedText);
              
              // Enhanced validation for long barcodes
              if (this.validateDetectedBarcodeEnhanced(detectedText)) {
                this.onBarcodeDetected(detectedText);
              } else {
                console.log('Invalid barcode format, continuing scan:', detectedText);
                
                // Try to find the most consistent detection if we have multiple attempts
                const consistentCode = this.findConsistentCode();
                if (consistentCode && this.validateDetectedBarcodeEnhanced(consistentCode)) {
                  console.log('Found consistent code from multiple scans:', consistentCode);
                  this.onBarcodeDetected(consistentCode);
                }
              }
            }
            if (error && error.name !== 'NotFoundException') {
              console.error('Scan error:', error);
            }
          }
        );
      }
    } catch (error) {
      console.error('Error starting camera:', error);
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
    console.log('Valid barcode detected:', barcode);
    
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
    if (this.barcodeInput.trim()) {
      this.getTripDataFromAPI(this.barcodeInput.trim());
    } else {
      alert('Silakan scan atau masukkan barcode');
    }
  }

  /**
   * Get trip data from API using the scanned/entered code
   */
  getTripDataFromAPI(tripCode: string) {
    this.isLoadingTripData = true;
    this.clearError(); 

    console.log('Getting trip data for:', tripCode);

    this.apiService.getTripData(tripCode).subscribe({
      next: (tripData: TripInfo) => {
        console.log('Trip data received:', tripData);

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
        console.error('Error getting trip data:', error);
        this.isLoadingTripData = false;
        
        // Show user-friendly error messages based on error type
        this.handleApiError(error);
      }
    });
  }

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
        console.log('getAllTripData response:', response);

        // Response: { TripData: { Result: [ { tripNumber: "..." }, ... ] } }
        const trips: any[] = response?.TripData?.Result ?? [];

        this.spkOptions = trips
          .map((t: any) => t.tripNumber ?? '')
          .filter((s: string) => s.length > 0);

        if (this.spkOptions.length === 1) {
          this.barcodeInput = this.spkOptions[0];
        } else {
          this.barcodeInput = '';
        }

        this.isLoadingSpk = false;
      },
      error: (error) => {
        console.error('getAllTripData error:', error);
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
      this.showError('Nomor SPK Tidak Valid', 'Nomor SPK yang dimasukkan tidak valid atau tidak ditemukan. Silakan periksa kembali barcode kendaraan.');
    } else if (error.status === 404) {
      this.showError('Nomor SPK Tidak Ditemukan', 'Nomor SPK tidak ditemukan dalam sistem. Pastikan barcode yang Anda scan atau input sudah benar.');
    } else if (error.status === 0) {
      this.showError('Koneksi Bermasalah', 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda dan coba lagi.');
    } else if (error.status === 401) {
      this.showError('Autentikasi Gagal', 'Sesi Anda telah berakhir. Silakan login kembali.');
    } else if (error.status === 403) {
      this.showError('Akses Ditolak', 'Anda tidak memiliki izin untuk mengakses data ini. Hubungi administrator.');
    } else if (error.status >= 500) {
      this.showError('Kesalahan Server', 'Terjadi kesalahan pada server. Silakan coba lagi dalam beberapa saat.');
    } else {
      this.showError('Nomor SPK Tidak Ditemukan', `Nomor SPK tidak ditemukan atau tidak valid. Silakan periksa kembali barcode kendaraan.`);
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

  onBarcodeInputChange() {
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
    return this.validateDetectedBarcodeEnhanced(this.barcodeInput.trim());
  }

  toggleManualInput() {
    this.showManualInput = !this.showManualInput;
  }

  get filteredSpkOptions(): string[] {
    if (!this.spkSearchQuery.trim()) return this.spkOptions;
    const q = this.spkSearchQuery.trim().toUpperCase();
    return this.spkOptions.filter(s => s.toUpperCase().includes(q));
  }

  toggleSpkDropdown() {
    this.spkDropdownOpen = !this.spkDropdownOpen;
    if (this.spkDropdownOpen) this.spkSearchQuery = '';
  }

  selectSpk(spk: string) {
    this.barcodeInput = spk;
    this.spkDropdownOpen = false;
    this.spkSearchQuery = '';
    this.clearError();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.spk-custom-dropdown')) {
      this.spkDropdownOpen = false;
    }
  }
}
