import { Component, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CollectionService } from '../../services/collection.service';
import { AuthService } from '../../services/auth.service';
import { SeriesProgress } from '../../models/collection.model';

@Component({
  selector: 'app-my-collection',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./my-collection.component.html",
  styleUrls: ["./my-collection.component.css"],
})
export class MyCollectionComponent implements OnInit {
  collections: SeriesProgress[] = [];
  userId?: number;
  
  // Add Modal State
  showAddModal = false;
  seriesList: any[] = [];
  selectedSeriesId: number | null = null;
  newItemName = '';
  serialNumber = '';
  condition = 'Mint';
  referenceValue: number | null = null;
  
  selectedFile: File | null = null;
  previewUrl: string | null = null;
  
  selectedDemoVideo: File | null = null;
  selectedReceipt: File | null = null;
  
  // Track existing files for Edit mode validation
  existingDemoVideoUrl: string | null = null;
  existingReceiptUrl: string | null = null;
  
  isUploading = false;
  formMode: 'add' | 'edit' = 'add';
  editingCollectibleId: number | null = null;

  conditionOptions = [
    'Brand New - Never used. May come with original packaging or tag.',
    'Like New - Used once or twice. As good as new.',
    'Lightly Used - Used with care. Flaws, if any, are barely noticeable.',
    'Well Used - Has minor flaws or defects.',
    'Heavily Used - Has obvious signs of use or defects.'
  ];

  // Series Detail Modal State
  showSeriesDetail = false;
  selectedSeries: {
    seriesId: number;
    seriesName: string;
    totalCount: number;
    ownedCount: number;
    collectibles: Array<{
      id: number;
      name: string;
      rarity: string;
      referenceValue: number;
      imageUrl: string | null;
      isOwned: boolean;
    }>;
  } | null = null;
  isLoadingSeriesDetail = false;

  constructor(
    private collectionService: CollectionService,
    private authService: AuthService
  ) {
    effect(() => {
      this.userId = this.authService.backendUser()?.id;
      if (this.userId) {
        this.refreshCollection();
      }
    });
  }

  ngOnInit(): void {
    this.loadSeries();
  }

  loadSeries() {
    this.collectionService.getSeries().subscribe(data => {
      this.seriesList = data;
    });
  }

  refreshCollection() {
    if (!this.userId) return;
    this.collectionService.getUserCollection(this.userId).subscribe(data => {
      this.collections = data;
    });
  }

  openAddModal(preselectedSeriesId?: number, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.formMode = 'add';
    this.resetForm();
    this.showAddModal = true;
    if (preselectedSeriesId) {
      this.selectedSeriesId = preselectedSeriesId;
    }
  }

  openEditModal(item: any, seriesId: number, event: Event) {
    event.stopPropagation();
    this.formMode = 'edit';
    this.editingCollectibleId = item.id;
    this.showAddModal = true;
    // Pre-fill form
    this.selectedSeriesId = seriesId;
    this.newItemName = item.name || '';
    this.previewUrl = item.imageUrl;
    
    // Existing files tracking
    this.existingDemoVideoUrl = item.demoVideoUrl || null;
    this.existingReceiptUrl = item.receiptUrl || null;

    this.serialNumber = item.serialNumber || '';
    // If item.condition isn't in our new set, default to first option
    this.condition = item.condition && this.conditionOptions.includes(item.condition) 
      ? item.condition 
      : this.conditionOptions[0];
      
    this.referenceValue = item.referenceValue || null;
  }

  closeAddModal() {
    this.showAddModal = false;
    this.resetForm();
  }

  resetForm() {
    this.selectedFile = null;
    this.previewUrl = null;
    this.selectedDemoVideo = null;
    this.selectedReceipt = null;
    this.existingDemoVideoUrl = null;
    this.existingReceiptUrl = null;
    this.newItemName = '';
    this.selectedSeriesId = null;
    this.serialNumber = '';
    this.condition = this.conditionOptions[0];
    this.referenceValue = null;
    this.editingCollectibleId = null;
    this.formMode = 'add';
  }

  formatReferenceValue() {
    if (this.referenceValue !== null) {
      this.referenceValue = parseFloat(this.referenceValue.toFixed(2));
    }
  }

  onFileSelected(event: any, type: 'image' | 'video' | 'receipt') {
    const file = event.target.files[0];
    if (file) {
      if (type === 'image') {
        if (file.type === 'image/avif') {
          alert('AVIF file type not supported. Please convert it to PNG, JPEG, or WebP.');
          return;
        }
        this.selectedFile = file;
        const reader = new FileReader();
        reader.onload = (e) => this.previewUrl = e.target?.result as string;
        reader.readAsDataURL(file);
      } else if (type === 'video') {
         this.selectedDemoVideo = file;
      } else if (type === 'receipt') {
         this.selectedReceipt = file;
      }
    }
  }

  saveItem() {
    if ((!this.selectedFile && this.formMode === 'add') || !this.selectedSeriesId || !this.userId) return;
    
    this.isUploading = true;
    
    const formData = new FormData();
    formData.append('userId', this.userId.toString());
    formData.append('seriesId', this.selectedSeriesId.toString());
    if (this.newItemName) formData.append('name', this.newItemName);
    if (this.serialNumber) formData.append('serialNumber', this.serialNumber);
    if (this.condition) formData.append('condition', this.condition);
    if (this.referenceValue) formData.append('referenceValue', this.referenceValue.toString());
    
    if (this.selectedFile) {
      formData.append('image', this.selectedFile);
    }
    if (this.selectedDemoVideo) {
      formData.append('demoVideo', this.selectedDemoVideo);
    }
    if (this.selectedReceipt) {
      formData.append('receipt', this.selectedReceipt);
    }

    if (this.formMode === 'add') {
       this.collectionService.addToCollection(formData).subscribe({
          next: () => {
            this.handleSuccess();
          },
          error: (err) => {
            this.handleError(err);
          }
        });
    } else {
       if (!this.editingCollectibleId) return;
       // For edit, we don't strictly typically need userId/seriesId in body if purely updating fields, 
       // but sending them doesn't hurt based on backend implementation.
       // Key is to call update endpoint
       this.collectionService.updateCollectible(this.editingCollectibleId, formData).subscribe({
          next: () => {
             this.handleSuccess();
          },
          error: (err) => {
             this.handleError(err);
          }
       });
    }
  }

  handleSuccess() {
    this.isUploading = false;
    this.closeAddModal();
    this.refreshCollection();
  }

  handleError(err: any) {
    console.error(err);
    this.isUploading = false;
    alert('Failed to save item.');
  }

  deleteCollectible(collectibleId: number, event: Event) {
    event.stopPropagation(); // Prevent any parent click handlers
    
    if (!confirm('Are you sure you want to delete this collectible?')) {
      return;
    }

    this.collectionService.deleteCollectible(collectibleId).subscribe({
      next: () => {
        this.refreshCollection(); // Refresh list - empty series will be automatically removed
        // Refresh series detail if it's open
        if (this.showSeriesDetail && this.selectedSeries) {
          this.openSeriesDetail(this.selectedSeries.seriesId);
        }
      },
      error: (err) => {
        console.error(err);
        alert('Failed to delete collectible.');
      }
    });
  }

  openSeriesDetail(seriesId: number, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    if (!this.userId) return;
    
    // Find the series info from collections
    const series = this.collections.find(s => s.seriesId === seriesId);
    if (!series) return;

    this.isLoadingSeriesDetail = true;
    this.showSeriesDetail = true;

    this.collectionService.getSeriesCollectibles(seriesId, this.userId).subscribe({
      next: (collectibles) => {
        const ownedCount = collectibles.filter(c => c.isOwned).length;
        this.selectedSeries = {
          seriesId: series.seriesId,
          seriesName: series.seriesName,
          totalCount: collectibles.length,
          ownedCount: ownedCount,
          collectibles: collectibles
        };
        this.isLoadingSeriesDetail = false;
      },
      error: (err) => {
        console.error('Error loading series detail:', err);
        alert('Failed to load series details.');
        this.isLoadingSeriesDetail = false;
        this.closeSeriesDetail();
      }
    });
  }

  closeSeriesDetail() {
    this.showSeriesDetail = false;
    this.selectedSeries = null;
  }
}
