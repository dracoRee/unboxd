import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, from, map, tap } from 'rxjs';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  currentUser = signal<any>(null);

  constructor(
    private supabaseService: SupabaseService, 
    private router: Router
  ) {
    // 1. Initial Session Check
    this.supabaseService.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        this.currentUser.set(session.user);
      }
    });

    // 2. Listen for Auth Changes
    this.supabaseService.auth.onAuthStateChange((event, session) => {
      console.log('Auth State Changed:', event, session?.user?.email);
      
      if (session) {
        this.currentUser.set(session.user);
      } else {
        this.currentUser.set(null);
      }
    });
  }

  register(data: any): Observable<any> {
    return from(this.supabaseService.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          name: data.name
        }
      }
    })).pipe(
      tap(({ data, error }) => {
        if (error) throw error;
      })
    );
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

  logout() {
    this.supabaseService.auth.signOut().then(() => {
      this.currentUser.set(null);
      this.router.navigate(['/login']);
    });
  }

  forgotPassword(email: string): Observable<any> {
    return from(this.supabaseService.auth.resetPasswordForEmail(email));
  }

  resetPassword(data: any): Observable<any> {
    return from(this.supabaseService.auth.updateUser({ password: data.password }));
  }

  isLoggedIn(): boolean {
    return !!this.currentUser();
  }
}
