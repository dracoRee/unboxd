import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-inbox',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container mx-auto px-4 py-8">
      <h1 class="text-3xl font-bold mb-8">Inbox</h1>
      <p class="text-gray-500">Inbox functionality is being moved to the new Chat page.</p>
    </div>
  `
})
export class InboxComponent {}
