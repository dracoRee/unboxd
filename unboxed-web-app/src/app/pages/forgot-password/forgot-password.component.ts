import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['../login/login.component.css']
})
export class ForgotPasswordComponent {
  email = '';
  error = signal('');
  success = signal(false);
  loading = signal(false);

  constructor(private authService: AuthService) {}

  onSubmit() {
    this.loading.set(true);
    this.error.set('');
    this.authService.forgotPassword(this.email).subscribe({
      next: () => {
        this.success.set(true);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.error || 'Failed to send reset link');
        this.loading.set(false);
      }
    });
  }
}
