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
  template: `
    <div class="container mx-auto px-4 py-8">

      <div class="flex justify-between items-center mb-8">
        <div>
          <h1 class="text-3xl font-bold bg-gradient-to-r from-primary-600 to-accent-500 bg-clip-text text-transparent">My Collection</h1>
          <p class="text-gray-500">Track your mastery and find missing pieces</p>
        </div>
        <button (click)="openAddModal()" class="btn-primary flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Add Item
        </button>
      </div>

      <!-- Empty State -->
      @if (collections.length === 0) {
        <div class="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-200">
          <div class="w-24 h-24 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-6">
             <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h2 class="text-2xl font-bold text-gray-800 mb-2">Your collection is empty</h2>
          <p class="text-gray-500 mb-8 max-w-md mx-auto">Start building your shelf by scanning or adding your first collectible.</p>
          <button (click)="openAddModal()" class="btn-primary px-8 py-3 rounded-xl shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 transition-all">
            Start Collecting
          </button>
        </div>
      }

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        @for (series of collections; track series.seriesId) {
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
            <div class="p-6">
              <div class="flex justify-between items-start mb-4">
                <h3 class="text-xl font-bold">{{ series.seriesName }}</h3>
                <span class="px-2 py-1 bg-primary-50 text-primary-600 text-xs font-bold rounded-full">
                  {{ (series.ownedItems / series.totalItems * 100) | number:'1.0-0' }}% Complete
                </span>
              </div>

              <!-- Progress Bar -->
              <div class="w-full bg-gray-100 rounded-full h-2 mb-6">
                <div class="bg-primary-500 h-2 rounded-full transition-all duration-1000" 
                     [style.width.%]="(series.ownedItems / series.totalItems * 100)"></div>
                <div class="text-xs text-right mt-1 text-gray-500">{{ series.ownedItems }} / {{ series.totalItems }} Items</div>
              </div>

              <!-- Gallery of User Items -->
              <div class="grid grid-cols-4 gap-2">
                @for (item of series.items; track item.id) {
                  <div class="relative group cursor-pointer" [title]="item.name">
                    <img [src]="item.imageUrl || 'assets/placeholder.png'" 
                         class="w-full aspect-square object-cover rounded-lg border border-gray-50 hover:scale-105 transition-transform">
                    <button 
                      (click)="deleteCollectible(item.id, $event)" 
                      class="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 transition-all shadow-lg z-10"
                      title="Delete">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                }
                <!-- Add Button Helper for Empty Slots visualization (optional) -->
                @if (series.ownedItems < series.totalItems) {
                   <div (click)="openAddModal(series.seriesId)" class="w-full aspect-square rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 hover:text-primary-500 hover:border-primary-300 cursor-pointer transition-colors">
                     <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                     </svg>
                   </div>
                }
              </div>
            </div>
          </div>
        }
      </div>

      <!-- Add Item Modal -->
      @if (showAddModal) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div class="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
            <div class="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 class="text-xl font-bold">Add Collectible</h2>
              <button (click)="closeAddModal()" class="text-gray-400 hover:text-gray-600">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div class="p-6 space-y-4">
              <!-- Image Upload -->
              <div class="flex flex-col items-center">
                <div (click)="fileInput.click()" class="w-32 h-32 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:bg-gray-100 overflow-hidden relative">
                  @if (previewUrl) {
                    <img [src]="previewUrl" class="w-full h-full object-cover">
                  } @else {
                    <div class="text-center p-2">
                       <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 mx-auto text-gray-400 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span class="text-xs text-gray-500">Upload Photo</span>
                    </div>
                  }
                  <input #fileInput type="file" (change)="onFileSelected($event)" accept="image/*" class="hidden">
                </div>
              </div>

              <!-- Series Selection -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Series</label>
                <select [(ngModel)]="selectedSeriesId" class="w-full rounded-xl border-gray-300 focus:border-primary-500 focus:ring focus:ring-primary-200 transition-all">
                  <option [ngValue]="null" disabled>Select Series</option>
                  @for (s of seriesList; track s.id) {
                    <option [value]="s.id">{{ s.name }}</option>
                  }
                </select>
              </div>

              <!-- Name Input -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Name (Optional)</label>
                <input type="text" [(ngModel)]="newItemName" placeholder="e.g. Secret Chaser" class="w-full rounded-xl border-gray-300 focus:border-primary-500 focus:ring focus:ring-primary-200 transition-all">
              </div>

              <!-- Submit Button -->
              <button (click)="saveItem()" [disabled]="!selectedFile || !selectedSeriesId || isUploading" 
                      class="w-full btn-primary py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed">
                @if (isUploading) {
                  <span class="animate-pulse">Saving...</span>
                } @else {
                  Save to Collection
                }
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: []
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
