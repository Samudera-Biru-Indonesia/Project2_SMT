import { Injectable } from '@angular/core';
import { BarcodeFormat } from '@zxing/library';

@Injectable({
  providedIn: 'root'
})
export class BarcodeService {
  // Supported barcode formats including 1D barcodes (barcode garis)
  public allowedFormats = [
    BarcodeFormat.CODE_128,    // Standard barcode format
    BarcodeFormat.CODE_39,     // Code 39 barcode
    BarcodeFormat.EAN_13,      // EAN-13 barcode
    BarcodeFormat.EAN_8,       // EAN-8 barcode
    BarcodeFormat.UPC_A,       // UPC-A barcode
    BarcodeFormat.UPC_E,       // UPC-E barcode
    BarcodeFormat.CODABAR,     // Codabar barcode
    BarcodeFormat.ITF,         // Interleaved 2 of 5
    BarcodeFormat.QR_CODE,     // QR Code (2D)
    BarcodeFormat.DATA_MATRIX, // Data Matrix (2D)
    BarcodeFormat.PDF_417      // PDF417 (2D)
  ];

  public hasDevices = false;
  public hasPermission = false;
  public availableDevices: MediaDeviceInfo[] = [];

  constructor() {}

  async checkCameraPermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop()); // Stop the stream immediately
      this.hasPermission = true;
      return true;
    } catch (error) {
      this.hasPermission = false;
      return false;
    }
  }

  async getVideoDevices(): Promise<MediaDeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.availableDevices = devices.filter(device => device.kind === 'videoinput');
      this.hasDevices = this.availableDevices.length > 0;
      return this.availableDevices;
    } catch (error) {
      return [];
    }
  }

  getPreferredCamera(): MediaDeviceInfo | undefined {
    if (this.availableDevices.length === 0) return undefined;

    // Try to find back camera first (better for barcode scanning)
    const backCamera = this.availableDevices.find(device => 
      device.label.toLowerCase().includes('back') || 
      device.label.toLowerCase().includes('rear') ||
      device.label.toLowerCase().includes('environment')
    );

    if (backCamera) return backCamera;

    // If no back camera, return the first available camera
    return this.availableDevices[0];
  }

  validateBarcode(code: string): boolean {
    // Basic validation for truck barcode format
    if (!code) return false;
    
    // Remove whitespace and normalize
    const cleanCode = code.trim().toUpperCase();
    
    // Allow various formats including long barcodes:
    // - SGI045-00149601 (site-truck format - main target)
    // - TRK-XXXX (truck format)
    // - Any alphanumeric code with at least 3 characters
    // - Numbers only (for simple barcodes)
    // - Long numeric codes (up to 25 digits)
    const patterns = [
      /^[A-Z]{3}\d{3}-\d{8,}$/i,     // SGI045-00149601 format (site code + truck number)
      /^[A-Z]{2,4}\d{2,4}-\d{6,}$/i, // General site-truck format
      /^TRK-\d{4,}$/i,               // TRK-1234 format
      /^[A-Z0-9]{3,25}$/i,           // General alphanumeric (3-25 chars)
      /^\d{3,25}$/,                  // Numbers only (3-25 digits)
      /^[A-Z]{2,5}-\d{3,}$/i,        // XX-123 or XXX-123 format
      /^[A-Z]{2,5}-[A-Z0-9]{3,}$/i   // Mixed alphanumeric with dash
    ];

    const isValid = patterns.some(pattern => pattern.test(cleanCode));
    
    // Additional length check for long barcodes
    if (!isValid && cleanCode.length >= 8 && cleanCode.length <= 30) {
      // Accept any alphanumeric string of reasonable length including dashes
      return /^[A-Z0-9\-]{8,30}$/i.test(cleanCode);
    }

    return isValid;
  }

  formatBarcode(code: string): string {
    // Clean and format the barcode
    const cleaned = code.trim().toUpperCase();
    
    // Keep original format for complex barcodes like SGI045-00149601
    if (/^[A-Z]{3}\d{3}-\d{8,}$/i.test(cleaned)) {
      return cleaned; // Keep as-is for site-truck format
    }
    
    // If it's just numbers and length > 4, format as TRK-XXXX
    if (/^\d{4,}$/.test(cleaned)) {
      return `TRK-${cleaned}`;
    }
    
    return cleaned;
  }
}
