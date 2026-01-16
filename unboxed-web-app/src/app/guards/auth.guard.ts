import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Injectable }  from '@angular/core';
import { AuthService } from '../services/auth.service';
import { SupabaseService } from '../services/supabase.service';
import { UserService } from '../services/user.service';

@Injectable({ providedIn: 'root' })
export class authGuard {

  constructor(
    private auth: AuthService,
    private router: Router,
    private supabaseService: SupabaseService,
    private userService: UserService
  ) {}

  async canActivate(): Promise<boolean> {
    // Wait for session to be checked (important for production where session might not be loaded immediately)
    try {
      const { data: { session } } = await this.supabaseService.auth.getSession();
      
      if (session) {
        // Ensure currentUser is set
        if (!this.auth.currentUser()) {
          this.auth.currentUser.set(session.user);
          // Sync with backend
          if (session.user.email) {
            const name = session.user.user_metadata?.['name'] || session.user.email.split('@')[0];
            this.userService.syncUser(session.user.email, name).subscribe({
              next: (user) => {
                this.auth.backendUser.set(user);
              },
              error: (err) => console.error('Failed to sync with backend:', err)
            });
          }
        }
        return true;
      }
    } catch (error) {
      console.error('Error checking session in guard:', error);
    }

    // If no session, check if user is already logged in (fallback)
    if (this.auth.isLoggedIn()) {
      return true;
    }

    this.router.navigate(['/login']);
    return false;
  }
}
