import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, from, map, tap } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { UserService } from './user.service';
import { environment } from '@/environments/environment';

const host_url = environment.apiBaseUrl;

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  currentUser = signal<any>(null);
  backendUser = signal<any>(null);
  private apiUrl = host_url;

  constructor(
    private supabaseService: SupabaseService, 
    private userService: UserService,
    private router: Router,
    private http: HttpClient
  ) {

    // 1. Initial Session Check
    this.supabaseService.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        this.currentUser.set(session.user);
        this.syncWithBackend(session.user);
      }
    });

    // 2. Listen for Auth Changes
    this.supabaseService.auth.onAuthStateChange((event, session) => {
      console.log('Auth State Changed:', event, session?.user?.email);
      
      if (session) {
        this.currentUser.set(session.user);
        this.syncWithBackend(session.user);
      } else {
        this.currentUser.set(null);
        this.backendUser.set(null);
      }
    });
  }

  private syncWithBackend(supabaseUser: any) {
    const name = supabaseUser.user_metadata?.name || supabaseUser.email.split('@')[0];
    this.userService.syncUser(supabaseUser.email, name).subscribe({
      next: (user) => {
        this.backendUser.set(user);
        console.log('Backend Identity Resolved:', user);
      },
      error: (err) => console.error('Failed to sync with backend:', err)
    });
  }

  /**
   * Registers a new user with email, password, and name.
   * @param credentials - User's email, password, and name.
   */
  register(credentials: { email: string; password: string; name: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/register`, credentials);
  }

  login(credentials: any): Observable<any> {
    return from(this.supabaseService.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password
    })).pipe(
      tap(({ data, error }) => {
        if (error) throw error;
        this.currentUser.set(data.user);
      }),
      map(({ data }) => data)
    );
  }

  loginWithGoogle(): Observable<any> {
    return from(this.supabaseService.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/browse'
      }
    })).pipe(
      tap(({ data, error }) => {
        if (error) throw error;
      })
    );
  }

  logout() {
    this.supabaseService.auth.signOut().then(() => {
      this.currentUser.set(null);
      this.router.navigate(['/login']);
    });
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/forgot-password`, { email });
  }

  resetPassword(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/reset-password`, data);
  }

  isLoggedIn(): boolean {
    return !!this.currentUser();
  }
}
