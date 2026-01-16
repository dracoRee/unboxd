import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { environment } from '@/environments/environment';

const host_url = environment.apiBaseUrl;

@Component({
  selector: 'app-upload-item',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './upload-item.component.html',
  styleUrl: './upload-item.component.css'
})
export class UploadItemComponent implements OnInit {
  // Form fields
  selectedCollectibleId: string = '';
  collectibles: any[] = [];
  serialNumber: string = '';
  demoVideoFile: File | null = null;
  demoVideoPreview: string | null = null;
  receiptFile: File | null = null;
  receiptPreview: string | null = null;
  
  // UI state
  isSubmitting: boolean = false;
  uploadedImageUrl: string | null = null;
  
  constructor(
    private router: Router,
    private authService: AuthService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    // Get the uploaded image from session storage or state
    const storedImage = sessionStorage.getItem('uploadedItemImage');
    if (storedImage) {
      this.uploadedImageUrl = storedImage;
    }
    const collectiblesUrl = new URL('/collectibles', host_url).toString();
    // Fetch collectibles for the dropdown
    this.http.get(collectiblesUrl).subscribe({
      next: (data: any) => {
        this.collectibles = data;
      },
      error: (error) => console.error('Error fetching collectibles:', error)
    });
  }

  onDemoVideoSelected(event: any): void {
    const file = event.target.files[0];
    if (file && file.type.startsWith('video/')) {
      this.demoVideoFile = file;
      
      // Create preview URL for video
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.demoVideoPreview = e.target.result;
      };
      reader.readAsDataURL(file);
    } else {
      alert('Please select a valid video file.');
      event.target.value = '';
    }
  }

  onReceiptSelected(event: any): void {
    const file = event.target.files[0];
    if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
      this.receiptFile = file;
      
      // Create preview URL for receipt
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.receiptPreview = e.target.result;
      };
      reader.readAsDataURL(file);
    } else {
      alert('Please select a valid image or PDF file.');
      event.target.value = '';
    }
  }

  removeDemoVideo(): void {
    this.demoVideoFile = null;
    this.demoVideoPreview = null;
  }

  removeReceipt(): void {
    this.receiptFile = null;
    this.receiptPreview = null;
  }

  isFormValid(): boolean {
    return this.serialNumber.trim().length > 0 && 
           this.demoVideoFile !== null && 
           this.receiptFile !== null &&
           this.selectedCollectibleId !== '';
  }

  async submitListing(): Promise<void> {
    if (!this.isFormValid()) {
      alert('Please fill in all required fields.');
      return;
    }

    this.isSubmitting = true;

    try {
      const userId = this.authService.backendUser()?.id;
      if (!userId) {
        alert('User not authenticated. Please log in again.');
        return;
      }

      // Create FormData object
      const formData = new FormData();
      formData.append('userId', userId.toString());
      formData.append('collectibleId', this.selectedCollectibleId);
      formData.append('serialNumber', this.serialNumber);
      formData.append('demoVideo', this.demoVideoFile!);
      formData.append('receipt', this.receiptFile!);
      
      // Convert base64 image to blob and append
      if (this.uploadedImageUrl) {
        const response = await fetch(this.uploadedImageUrl);
        const blob = await response.blob();
        formData.append('image', blob, 'collectible.jpg');
      }
      const listingsUrl = new URL('/listings/create', host_url).toString();
      // Submit to backend
      this.http.post(listingsUrl, formData)
        .subscribe({
          next: (result: any) => {
            console.log('Listing created successfully:', result);
            
            // Clear session storage
            sessionStorage.removeItem('uploadedItemImage');
            
            alert('Your item has been successfully listed!');
            
            // Navigate back to trades page
            this.router.navigate(['/trades']);
          },
          error: (error) => {
            console.error('Error submitting listing:', error);
            alert(`Failed to submit listing: ${error.error?.error || error.message || 'Unknown error'}`);
            this.isSubmitting = false;
          },
          complete: () => {
            this.isSubmitting = false;
          }
        });
    } catch (error) {
      console.error('Error preparing listing:', error);
      alert('Failed to prepare listing. Please try again.');
      this.isSubmitting = false;
    }
  }

  cancel(): void {
    if (confirm('Are you sure you want to cancel? All entered information will be lost.')) {
      sessionStorage.removeItem('uploadedItemImage');
      this.router.navigate(['/trades']);
    }
  }
}
