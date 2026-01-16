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
    if (await this.auth.isAuthenticated()) {
      return true;
    }

    this.router.navigate(['/login']);
    return false;
  }
}
