import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-trades',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container mx-auto px-4 py-12">
      <h1 class="text-3xl font-bold mb-6">Active Trades</h1>
      <div class="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center">
        <div class="w-20 h-20 bg-accent-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-accent-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </div>
        <h2 class="text-xl font-semibold mb-2">No active trades yet</h2>
        <p class="text-gray-500 max-w-sm mx-auto">When you propose trades or receive offers, they will appear here for you to manage.</p>
      </div>
    </div>
  `
})
export class TradesComponent {}
