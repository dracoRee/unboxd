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
  selectedFile: File | null = null;
  previewUrl: string | null = null;
  isUploading = false;

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

  openAddModal(preselectedSeriesId?: number) {
    this.showAddModal = true;
    if (preselectedSeriesId) {
      this.selectedSeriesId = preselectedSeriesId;
    }
  }

  closeAddModal() {
    this.showAddModal = false;
    this.selectedFile = null;
    this.previewUrl = null;
    this.newItemName = '';
    this.selectedSeriesId = null;
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      if (file.type === 'image/avif') {
        alert('AVIF file type not supported. Please convert it to PNG, JPEG, or WebP.');
        return;
      }
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = (e) => this.previewUrl = e.target?.result as string;
      reader.readAsDataURL(file);
    }
  }

  saveItem() {
    if (!this.selectedFile || !this.selectedSeriesId || !this.userId) return;
    
    this.isUploading = true;
    
    // 1. Upload Image
    this.collectionService.uploadImage(this.selectedFile).subscribe({
      next: (uploadRes) => {
        const imageUrl = uploadRes.url;
        
        // 2. Add to Collection
        this.collectionService.addToCollection(
          this.userId!, 
          this.selectedSeriesId!, 
          imageUrl, 
          this.newItemName
        ).subscribe({
          next: () => {
            this.isUploading = false;
            this.closeAddModal();
            this.refreshCollection(); // Refresh list
          },
          error: (err) => {
            console.error(err);
            this.isUploading = false;
            alert('Failed to save item.');
          }
        });
      },
      error: (err) => {
        console.error(err);
        this.isUploading = false;
        alert('Failed to upload image.');
      }
    });
  }

  deleteCollectible(collectibleId: number, event: Event) {
    event.stopPropagation(); // Prevent any parent click handlers
    
    if (!confirm('Are you sure you want to delete this collectible?')) {
      return;
    }

    this.collectionService.deleteCollectible(collectibleId).subscribe({
      next: () => {
        this.refreshCollection(); // Refresh list - empty series will be automatically removed
      },
      error: (err) => {
        console.error(err);
        alert('Failed to delete collectible.');
      }
    });
  }
}
