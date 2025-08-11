import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BrowserMultiFormatReader, Result } from '@zxing/library';
import { BarcodeService } from '../../services/barcode.service';
import { ApiService, TripInfo } from '../../services/api.service';

@Component({
  selector: 'app-scan-barcode',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './scan-barcode.component.html',
  styleUrls: ['./scan-barcode.component.css']
})
export class ScanBarcodeComponent implements OnInit, OnDestroy {
  @ViewChild('videoElement', { static: false }) videoElement!: ElementRef<HTMLVideoElement>;
  
  barcodeInput: string = '';
  isScanning: boolean = false;
  hasCamera: boolean = false;
  cameraError: string = '';
  isLoadingTripData: boolean = false;
  showManualInput: boolean = false;
  
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
  }

  ngOnDestroy() {
    this.stopScanning();
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
      alert('Kamera tidak tersedia. Silakan gunakan input manual.');
      return;
    }

    try {
      this.isScanning = true;
      this.cameraError = '';
      
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

    console.log('Getting trip data for:', tripCode);

    this.apiService.getTripData(tripCode).subscribe({
      next: (tripData: TripInfo) => {
        console.log('Trip data received:', tripData);
        
        // Store trip data and barcode in localStorage
        localStorage.setItem('currentTruckBarcode', tripCode);
        localStorage.setItem('currentTripData', JSON.stringify(tripData));
        
        this.isLoadingTripData = false;
        
        // Navigate to trip selection page with trip data
        this.router.navigate(['/trip-selection']);
      },
      error: (error) => {
        console.error('Error getting trip data:', error);
        this.isLoadingTripData = false;
        
        // Show alert for trip number not found and prevent continuation
        if (error.status === 404) {
          alert('Trip number tidak ditemukan. Silakan periksa kembali barcode kendaraan.');
        } else if (error.status === 0) {
          alert('Gagal mengambil data perjalanan. Periksa koneksi internet Anda.');
        } else if (error.status === 401) {
          alert('Autentikasi gagal. Silakan login kembali.');
        } else if (error.status === 403) {
          alert('Akses ditolak. Anda tidak memiliki izin untuk mengakses data ini.');
        } else if (error.status >= 500) {
          alert('Kesalahan server. Silakan coba lagi nanti.');
        } else {
          alert(`Trip number tidak valid atau tidak ditemukan (HTTP ${error.status}). Silakan periksa kembali barcode.`);
        }
        
        // Do not allow user to continue - they must scan/enter a valid barcode
      }
    });
  }

  goBack() {
    this.stopScanning();
    this.router.navigate(['/landing']);
  }

  onBarcodeInputChange() {
    // Clean input as user types for better validation
    if (this.barcodeInput) {
      // Remove any unwanted characters and normalize
      this.barcodeInput = this.barcodeInput.trim().toUpperCase();
    }
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
}
