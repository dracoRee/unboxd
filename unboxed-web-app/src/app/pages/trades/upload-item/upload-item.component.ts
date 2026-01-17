import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { environment } from '@/environments/environment';
import { UserService } from '../../../services/user.service';
import { CollectionService } from '../../../services/collection.service';

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
  title: string = '';
  seriesName: string = '';
  availableSeries: any[] = [];
  selectedSeries: string = '';
  customSeriesName: string = '';
  availableModels: any[] = [];
  selectedModelId: number | null = null;
  description: string = '';
  serialNumber: string = '';
  referenceValue: number | null = null;
  
  condition: string = 'BRAND_NEW';
  conditionOptions = [
    { value: 'BRAND_NEW', label: 'Brand New - Never used. May come with original packaging or tag.' },
    { value: 'LIKE_NEW', label: 'Like New - Used once or twice. As good as new.' },
    { value: 'LIGHTLY_USED', label: 'Lightly Used - Used with care. Flaws, if any, are barely noticeable.' },
    { value: 'WELL_USED', label: 'Well Used - Has minor flaws or defects.' },
    { value: 'HEAVILY_USED', label: 'Heavily Used - Has obvious signs of use or defects.' }
  ];

  dealMethods = {
    meetup: false,
    delivery: false
  };

  demoVideoFile: File | null = null;
  demoVideoPreview: string | null = null;
  receiptFile: File | null = null;
  receiptPreview: string | null = null;
  
  // UI state
  isSubmitting: boolean = false;
  uploadedImageUrl: string | null = null;
  
  // Editing state
  isEditing: boolean = false;
  editingId: number | null = null;
  existingListing: any = null;
  
  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private http: HttpClient,
    private userService: UserService,
    private collectionService: CollectionService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditing = true;
      this.editingId = parseInt(id, 10);
      this.loadListing(this.editingId);
    } else {
      // Get the uploaded image from session storage or state
      const storedImage = sessionStorage.getItem('uploadedItemImage');
      if (storedImage) {
        this.uploadedImageUrl = storedImage;
      }
    }
    this.loadSeries();
  }

  loadSeries() {
    this.collectionService.getSeries().subscribe({
      next: (series) => {
        this.availableSeries = series;
        this.matchSeriesSelection();
      },
      error: (err) => console.error('Failed to load series', err)
    });
  }

  matchSeriesSelection() {
    if (this.seriesName && this.availableSeries.length > 0) {
      const match = this.availableSeries.find(s => s.name === this.seriesName);
      if (match) {
        this.selectedSeries = this.seriesName;
        // Load models for the matched series
        this.loadModelsBySeries(match.id);
      } else {
        this.selectedSeries = 'custom';
        this.customSeriesName = this.seriesName;
      }
    }
  }

  onSeriesChange() {
    if (this.selectedSeries !== 'custom') {
      this.seriesName = this.selectedSeries;
      this.customSeriesName = '';
      
      const series = this.availableSeries.find(s => s.name === this.selectedSeries);
      if (series) {
        this.loadModelsBySeries(series.id);
      }
    } else {
      this.seriesName = this.customSeriesName;
      this.availableModels = [];
      this.selectedModelId = null;
    }
  }

  loadModelsBySeries(seriesId: number) {
    this.collectionService.getCollectiblesBySeries(seriesId).subscribe({
      next: (models) => {
        this.availableModels = models;
        
        // Auto-select if there's only one model
        if (models.length === 1) {
          this.selectedModelId = models[0].id;
          this.onModelChange();
        }
        
        // If editing and we have a collectibleId, try to match it
        if (this.isEditing && this.existingListing?.collectibleId) {
          this.selectedModelId = this.existingListing.collectibleId;
          // Ensure reference value and title are updated if needed
          this.onModelChange();
        }
      },
      error: (err) => console.error('Failed to load models', err)
    });
  }

  onModelChange() {
    if (this.selectedModelId) {
      const model = this.availableModels.find(m => m.id === Number(this.selectedModelId));
      if (model) {
        this.referenceValue = model.referenceValue;
        // Also update title if it's empty
        if (!this.title) {
          this.title = model.name;
        }
      }
    }
  }

  onCustomSeriesInput() {
    if (this.selectedSeries === 'custom') {
      this.seriesName = this.customSeriesName;
    }
  }

  getCharacterLength(text: string): number {
    if (!text) return 0;
      return text.length;
  }

  isCharLengthValid(text: string, limit: number): boolean {
    return this.getCharacterLength(text) <= limit;
  }

  loadListing(id: number) {
    this.userService.getListing(id).subscribe({
      next: (listing) => {
        this.existingListing = listing;
        this.title = listing.title;
        this.seriesName = listing.seriesName || '';
        this.description = listing.description;
        this.condition = listing.condition;
        this.serialNumber = listing.serialNumber;
        this.referenceValue = listing.referenceValue || null;
        this.uploadedImageUrl = listing.imageUrl || null;

        this.matchSeriesSelection();

        if (listing.dealMethods) {
          const methods = Array.isArray(listing.dealMethods) ? listing.dealMethods : 
            (typeof listing.dealMethods === 'string' ? JSON.parse(listing.dealMethods) : []);
          
          this.dealMethods = {
            meetup: methods.includes('Meet-up'),
            delivery: methods.includes('Delivery')
          };
        }

        this.demoVideoPreview = listing.demoVideoUrl;
        this.receiptPreview = listing.receiptUrl;
      },
      error: (err) => {
        console.error('Failed to load listing', err);
        alert('Failed to load listing details.');
        this.router.navigate(['/trades']);
      }
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
    const hasDealMethod = this.dealMethods.meetup || this.dealMethods.delivery;
    const modelValid = this.selectedSeries === 'custom' || !!this.selectedModelId;
    const basicValid = this.title.trim().length > 0 &&
           this.seriesName.trim().length > 0 &&
           this.serialNumber.trim().length > 0 && 
           this.referenceValue !== null &&
           hasDealMethod &&
           modelValid &&
           this.isCharLengthValid(this.title, 50) &&
           this.isCharLengthValid(this.description, 1000);

    if (this.isEditing) {
        const videoValid = this.demoVideoFile !== null || !!this.existingListing?.demoVideoUrl;
        const receiptValid = this.receiptFile !== null || !!this.existingListing?.receiptUrl;
        return basicValid && videoValid && receiptValid;
    } else {
        return basicValid && this.demoVideoFile !== null && this.receiptFile !== null && !!this.uploadedImageUrl;
    }
  }

  async submitListing(): Promise<void> {
    if (!this.isFormValid()) {
      alert('Please fill in all required fields.');
      return;
    }

    this.isSubmitting = true;

    try {
      const userId = this.authService.backendUser()?.id;
      if (!userId && !this.isEditing) { // UserId might be needed for check but backend handles it
         // Allow editing if we have loaded listing? Actually we need auth always
      }
      if (!userId) {
        alert('User not authenticated. Please log in again.');
        this.isSubmitting = false;
        return;
      }

      // Create FormData object
      const formData = new FormData();
      formData.append('userId', userId.toString());
      formData.append('title', this.title);
      formData.append('seriesName', this.seriesName);
      if (this.selectedModelId) {
        formData.append('collectibleId', this.selectedModelId.toString());
      }
      formData.append('description', this.description);
      formData.append('condition', this.condition);
      formData.append('referenceValue', this.referenceValue!.toString());
      
      const methods = [];
      if (this.dealMethods.meetup) methods.push('Meet-up');
      if (this.dealMethods.delivery) methods.push('Delivery');
      formData.append('dealMethods', JSON.stringify(methods));

      formData.append('serialNumber', this.serialNumber);
      
      if (this.demoVideoFile) formData.append('demoVideo', this.demoVideoFile!);
      if (this.receiptFile) formData.append('receipt', this.receiptFile!);
      
      // Convert base64 image to blob and append if new
      if (this.uploadedImageUrl && !this.uploadedImageUrl.startsWith('http')) {
        const response = await fetch(this.uploadedImageUrl);
        const blob = await response.blob();
        formData.append('image', blob, 'collectible.jpg');
      }

      const listingsUrl = new URL('/listings/create', host_url).toString();
      
      if (this.isEditing && this.editingId) {
        this.userService.updateListing(this.editingId, formData).subscribe({
          next: (result) => {
            console.log('Listing updated:', result);
            alert('Listing updated successfully!');
            this.router.navigate(['/trades']);
          },
          error: (error) => {
            console.error('Error updating listing:', error);
            alert(`Failed to update listing: ${error.error?.error || error.message}`);
            this.isSubmitting = false;
          },
          complete: () => {
            this.isSubmitting = false;
          }
        });
      } else {
        // Create mode
        if (!this.demoVideoFile || !this.receiptFile) {
             // Redundant check but safe
             alert('Files required for new listing');
             this.isSubmitting = false;
             return;
        }
        
        this.http.post(listingsUrl, formData)
          .subscribe({
            next: (result: any) => {
              console.log('Listing created successfully:', result);
              sessionStorage.removeItem('uploadedItemImage');
              alert('Your item has been successfully listed!');
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
      }
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
