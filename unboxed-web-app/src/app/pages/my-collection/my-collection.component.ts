import { Component, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CollectionService } from '../../services/collection.service';
import { AuthService } from '../../services/auth.service';
import { SeriesProgress } from '../../models/collection.model';
// import { CategoryTabsComponent } from '../../components/category-tabs/category-tabs.component';

@Component({
  selector: 'app-my-collection',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container mx-auto px-4 py-8">

      <div class="flex justify-between items-center mb-8">
        <div>
          <h1 class="text-3xl font-bold bg-gradient-to-r from-primary-600 to-accent-500 bg-clip-text text-transparent">My Collection</h1>
          <p class="text-gray-500">Track your mastery and find missing pieces</p>
        </div>
        <button (click)="triggerScan()" class="btn-primary flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Scan to Add
        </button>
      </div>

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
              </div>

              <div class="grid grid-cols-4 gap-2">
                @for (item of series.items; track item.id) {
                  <div class="relative group cursor-help" [title]="item.name">
                    <img [src]="item.imageUrl" 
                         [class.grayscale]="!item.isOwned"
                         [class.opacity-40]="!item.isOwned"
                         class="w-full aspect-square object-cover rounded-lg border border-gray-50">
                    @if (item.isOwned) {
                      <div class="absolute -top-1 -right-1 bg-green-500 text-white rounded-full p-1 shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                        </svg>
                      </div>
                    }
                  </div>
                }
              </div>

              @if (series.ownedItems < series.totalItems) {
                <button (click)="findMissing(series)" class="w-full mt-6 py-2 text-sm font-semibold text-primary-600 bg-primary-50 rounded-xl hover:bg-primary-100 transition-colors">
                  Find {{ series.totalItems - series.ownedItems }} missing pieces
                </button>
              } @else {
                <div class="w-full mt-6 py-2 text-sm font-semibold text-center text-green-600 bg-green-50 rounded-xl">
                  ✨ Series Mastered
                </div>
              }
            </div>
          </div>
        }
      </div>

      <!-- Hidden file input for scanning -->
      <input type="file" #fileInput (change)="onFileSelected($event)" accept="image/*" class="hidden">

      <!-- Scanning Modal Placeholder -->
      @if (isScanning) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div class="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center">
            <div class="animate-pulse mb-4">
              <div class="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            <h2 class="text-xl font-bold mb-2">Analyzing image...</h2>
            <p class="text-gray-500">Gemini AI is identifying your collectible</p>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .grayscale {
      filter: grayscale(1);
    }
  `]
})
export class MyCollectionComponent implements OnInit {
  collections: SeriesProgress[] = [];
  isScanning = false;
  userId?: number;

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

  ngOnInit(): void {}

  refreshCollection() {
    if (!this.userId) return;
    this.collectionService.getUserCollection(this.userId).subscribe(data => {
      this.collections = data;
    });
  }

  triggerScan() {
    (document.querySelector('input[type="file"]') as HTMLInputElement).click();
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file && this.userId) {
      this.isScanning = true;
      this.collectionService.scanCollectible(file).subscribe({
        next: (result) => {
          this.isScanning = false;
          if (result.dbMatch) {
            alert(`Identified: ${result.dbMatch.name} from ${result.identification.series}!`);
            this.collectionService.addToCollection(this.userId!, result.dbMatch.id).subscribe(() => {
              this.refreshCollection();
            });
          } else {
            alert(`Identified character ${result.identification.name}, but it's not in our catalog yet!`);
          }
        },
        error: () => {
          this.isScanning = false;
          alert('Failed to scan. Please try again.');
        }
      });
    }
  }

  findMissing(series: SeriesProgress) {
    console.log('Finding missing items for', series.seriesName);
  }
}
