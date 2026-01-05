import { Routes } from '@angular/router';
import { BrowseComponent } from './pages/browse/browse.component';
import { TradesComponent } from './pages/trades/trades.component';
import { WishlistComponent } from './pages/wishlist/wishlist.component';
import { InboxComponent } from './pages/inbox/inbox.component';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { ForgotPasswordComponent } from './pages/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './pages/reset-password/reset-password.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'browse', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  { path: 'browse', component: BrowseComponent, canActivate: [authGuard] },
  { path: 'trades', component: TradesComponent, canActivate: [authGuard] },
  { path: 'wishlist', component: WishlistComponent, canActivate: [authGuard] },
  { path: 'inbox', component: InboxComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: 'browse' }
];
