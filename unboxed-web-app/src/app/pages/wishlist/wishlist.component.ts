import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TradeService } from '../../services/trade.service';
import { TradeItem } from '../../models/trade-item.model';

@Component({
  selector: 'app-wishlist',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container mx-auto px-4 py-8">
      <h1 class="text-3xl font-bold mb-8">My Wishlist</h1>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        @for (item of wishlist; track item.id) {
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden group">
            <div class="relative aspect-square overflow-hidden">
              <img [src]="item.imageUrl" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
              <button (click)="removeFromWishlist(item.id)" 
                      class="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full text-red-500 shadow-sm hover:bg-red-50 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clip-rule="evenodd" />
                </svg>
              </button>
            </div>
            <div class="p-4">
              <p class="text-xs text-indigo-600 font-bold uppercase tracking-wider mb-1">{{ item.series }}</p>
              <h3 class="font-bold text-gray-900 mb-2 truncate">{{ item.name }}</h3>
              <div class="flex justify-between items-center">
                <span class="text-lg font-black text-black">\${{ item.referenceValue }}</span>
                <span class="text-xs px-2 py-1 bg-gray-100 rounded-md font-medium text-gray-600">{{ item.rarity }}</span>
              </div>
            </div>
          </div>
        } @empty {
          <div class="col-span-full bg-white p-12 rounded-3xl border border-gray-100 text-center">
            <div class="w-20 h-20 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <h2 class="text-xl font-semibold mb-2">Your wishlist is empty</h2>
            <p class="text-gray-500 max-w-sm mx-auto">Heart items you're looking for to add them to your wishlist.</p>
          </div>
        }
      </div>
    </div>
  `
})
export class WishlistComponent implements OnInit {
  wishlist: TradeItem[] = [];
  userId = 1;

  constructor(private tradeService: TradeService) {}

  ngOnInit(): void {
    this.loadWishlist();
  }

  loadWishlist() {
    this.tradeService.getWishlist(this.userId).subscribe(items => {
      this.wishlist = items;
    });
  }

  removeFromWishlist(collectibleId: string) {
    this.tradeService.removeFromWishlist(this.userId, parseInt(collectibleId)).subscribe(() => {
      this.loadWishlist();
    });
  }
}
