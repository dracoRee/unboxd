import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupabaseService } from './supabaseService';

// Define the User type based on your database schema
interface User {
  id: string;
  username: string;
  phone_number: string;
  email: string;
  reputation_score: number;
  created_at: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="padding: 20px;">
      <h1>Supabase Users Test</h1>
      
      <div *ngIf="loading">Loading users...</div>
      
      <div *ngIf="error" style="color: red; padding: 10px; background: #fee; border-radius: 4px;">
        <strong>Error:</strong> {{ error }}
      </div>
      
      <div *ngIf="!loading && !error && data.length > 0">
        <h2>Users from Supabase:</h2>
        <p><strong>Total users:</strong> {{ data.length }}</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <thead>
            <tr style="background: #f0f0f0;">
              <th style="border: 1px solid #ddd; padding: 8px;">Username</th>
              <th style="border: 1px solid #ddd; padding: 8px;">Email</th>
              <th style="border: 1px solid #ddd; padding: 8px;">Phone</th>
              <th style="border: 1px solid #ddd; padding: 8px;">Reputation</th>
              <th style="border: 1px solid #ddd; padding: 8px;">Created At</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let user of data">
              <td style="border: 1px solid #ddd; padding: 8px;">{{ user.username }}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">{{ user.email }}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">{{ user.phone_number }}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">{{ user.reputation_score }}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">{{ user.created_at | date:'short' }}</td>
            </tr>
          </tbody>
        </table>
        
        <details style="margin-top: 20px;">
          <summary style="cursor: pointer;">View Raw JSON</summary>
          <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto;">{{ data | json }}</pre>
        </details>
      </div>
      
      <div *ngIf="!loading && !error && data.length === 0">
        <p>No users found in the database.</p>
      </div>
    </div>
  `
})
export class HomeComponent implements OnInit {
  data: User[] = [];
  loading = false;
  error: string | null = null;

  constructor(private supabaseService: SupabaseService) {}

  async ngOnInit() {
    this.loading = true;
    try {
      this.data = await this.supabaseService.fetchData('users');
      // console.log('Successfully fetched users:', this.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      this.error = error instanceof Error ? error.message : 'Failed to fetch data from users table';
    } finally {
      this.loading = false;
    }
  }
}