import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './reset-password.component.html',
  styleUrls: ['../login/login.component.css']
})
export class ResetPasswordComponent implements OnInit {
  newPassword = '';
  confirmPassword = '';
  token = '';
  error = signal('');
  success = signal(false);
  loading = signal(false);
  showNewPassword = signal(false);
  showConfirmPassword = signal(false);

  constructor(
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  toggleNewPasswordVisibility() {
    this.showNewPassword.update(v => !v);
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword.update(v => !v);
  }

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!this.token) {
      this.error.set('Invalid reset link');
    }
  }

  onSubmit() {
    if (this.newPassword !== this.confirmPassword) {
      this.error.set('Passwords do not match');
      return;
    }

    this.loading.set(true);
    this.error.set('');
    this.authService.resetPassword({ token: this.token, newPassword: this.newPassword }).subscribe({
      next: () => {
        this.success.set(true);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.error || 'Failed to reset password');
        this.loading.set(false);
      }
    });
  }
}
