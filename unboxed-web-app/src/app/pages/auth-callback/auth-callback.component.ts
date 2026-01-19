import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './auth-callback.component.html',
  styleUrls: ['./auth-callback.component.css']
})
export class AuthCallbackComponent implements OnInit {
  loading = signal(true);
  error = signal('');

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.handleCallback();
  }

  private async handleCallback(): Promise<void> {
    this.loading.set(true);
    this.error.set('');

    try {
      await this.authService.handleOAuthCallback('/browse');
    } catch (err: any) {
      console.error('OAuth callback error:', err);
      this.error.set(err?.message || 'Failed to complete sign-in. Please try again.');
      this.loading.set(false);
    }
  }
}