// BUG: 

// Expected: 
// Suspect: 
//          
// Possible fix: 
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  email = '';
  password = '';
  error = signal('');
  showPassword = signal(false);
  loading = signal(false);

  constructor(private authService: AuthService, private router: Router) {}

  togglePasswordVisibility() {
    this.showPassword.update(v => !v);
  }

  onSubmit() {
    this.loading.set(true);
    this.error.set('');
    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: () => {
        this.router.navigate(['/browse']);
      },
      error: (err) => {
        this.error.set(err.error?.error || 'Login failed');
        this.loading.set(false);
      }
    });
  }

  loginWithGoogle() {
    this.loading.set(true);
    this.error.set('');
    this.authService.loginWithGoogle().subscribe({
      next: () => {
        // OAuth will redirect, so we don't need to navigate here
        // The redirection will happen automatically via Supabase
        //console.log('Google OAuth initiated');
      },
      error: (err) => {
        console.error('Google login error:', err);
        this.error.set(err.message || 'Google login failed. Please try again.');
        this.loading.set(false);
      }
    });
  }
}
