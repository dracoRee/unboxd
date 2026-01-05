import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, of, throwError } from 'rxjs';

interface AuthResponse {
  token: string;
  user: {
    id: number;
    email: string;
    name: string | null;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3000/auth';
  currentUser = signal<any>(null);

  constructor(private http: HttpClient, private router: Router) {
    const token = localStorage.getItem('token');
    if (token) {
      const user = JSON.parse(localStorage.getItem('user') || 'null');
      this.currentUser.set(user);
    }
  }

  register(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, data);
  }

  login(credentials: any): Observable<AuthResponse> {
    // Hardcoded login for demonstration
    if (credentials.email === 'test@unboxed.com' && credentials.password === 'password123') {
      const mockRes: AuthResponse = {
        token: 'mock-jwt-token',
        user: { id: 1, email: 'test@unboxed.com', name: 'Test User' }
      };
      
      localStorage.setItem('token', mockRes.token);
      localStorage.setItem('user', JSON.stringify(mockRes.user));
      this.currentUser.set(mockRes.user);
      
      return of(mockRes);
    }

    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap(res => {
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));
        this.currentUser.set(res.user);
      })
    );
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/forgot-password`, { email });
  }

  resetPassword(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/reset-password`, data);
  }

  isLoggedIn(): boolean {
    return !!this.currentUser();
  }
}
