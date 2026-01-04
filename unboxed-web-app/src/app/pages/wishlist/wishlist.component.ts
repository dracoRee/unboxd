import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-wishlist',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container mx-auto px-4 py-12">
      <h1 class="text-3xl font-bold mb-6">My Wishlist</h1>
      <div class="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center">
        <div class="w-20 h-20 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </div>
        <h2 class="text-xl font-semibold mb-2">Your wishlist is empty</h2>
        <p class="text-gray-500 max-w-sm mx-auto">Heart items you're looking for to add them to your wishlist and get notified when they become available for trade.</p>
      </div>
    </div>
  `
})
export class WishlistComponent {}
