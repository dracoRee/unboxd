import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrls: ['../login/login.component.css', './register.component.css']
})
export class RegisterComponent {
  name = '';
  email = '';
  password = '';
  confirmPassword = '';
  error = signal('');
  loading = signal(false);
  showPassword = signal(false);
  showConfirmPassword = signal(false);

  constructor(private authService: AuthService, private router: Router) {}

  togglePasswordVisibility() {
    this.showPassword.update(v => !v);
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword.update(v => !v);
  }

  isPasswordComplex(): boolean {
    return this.hasUpperCase() && this.hasLowerCase() && this.hasSpecialChar() && this.hasMinLength();
  }

  hasUpperCase(): boolean {
    return /[A-Z]/.test(this.password);
  }

  hasLowerCase(): boolean {
    return /[a-z]/.test(this.password);
  }

  hasSpecialChar(): boolean {
    return /[!@#$%^&*(),.?":{}|<>]/.test(this.password);
  }

  hasMinLength(): boolean {
    return this.password.length >= 8;
  }

  passwordsMatch(): boolean {
    return this.password === this.confirmPassword;
  }

  onSubmit() {
    if (!this.isPasswordComplex()) {
      this.error.set('Password must have 8+ chars, uppercase, lowercase, and a special character.');
      return;
    }

    if (!this.passwordsMatch()) {
      this.error.set('Passwords do not match.');
      return;
    }

    this.loading.set(true);
    this.error.set('');
    this.authService.register({ 
      email: this.email, 
      password: this.password,
      name: this.name 
    }).subscribe({
      next: () => {
        this.router.navigate(['/login'], { queryParams: { registered: true } });
      },
      error: (err) => {
        this.error.set(err.error?.error || err.message || 'Registration failed');
        this.loading.set(false);
      }
    });
  }

  loginWithGoogle() {
    this.loading.set(true);
    this.authService.loginWithGoogle().subscribe({
      error: (err) => {
        this.error.set(err.message || 'Google login failed');
        this.loading.set(false);
      }
    });
  }
}
