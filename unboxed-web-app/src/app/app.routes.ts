import { Routes } from '@angular/router';
import { ChatPageComponent } from './pages/chat-page/chat-page.component';
import { BrowseComponent } from './pages/browse/browse.component';
import { TradesComponent } from './pages/trades/trades.component';
import { UploadItemComponent } from './pages/trades/upload-item/upload-item.component';
import { WishlistComponent } from './pages/wishlist/wishlist.component';
import { MyCollectionComponent } from './pages/my-collection/my-collection.component';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { ForgotPasswordComponent } from './pages/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './pages/reset-password/reset-password.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { SettingsComponent } from './pages/settings/settings.component';
import { SeriesComponent } from './pages/series/series.component';
import { authGuard } from './guards/auth.guard';
import { HomeComponent } from '../../config/Home';
import { AuthCallbackComponent } from './pages/auth-callback/auth-callback.component';

export const routes: Routes = [
  { path: '', redirectTo: 'browse', pathMatch: 'full' },
  { path: 'chat', component: ChatPageComponent, canActivate: [authGuard] },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  { path: 'auth/callback', component: AuthCallbackComponent },
  { path: 'browse', component: BrowseComponent, canActivate: [authGuard] },
  { path: 'trades', component: TradesComponent, canActivate: [authGuard] },
  { path: 'trades/upload-item', component: UploadItemComponent, canActivate: [authGuard] },
  { path: 'trades/edit-item/:id', component: UploadItemComponent, canActivate: [authGuard] },
  { path: 'wishlist', component: WishlistComponent, canActivate: [authGuard] },
  { path: 'my-collection', component: MyCollectionComponent, canActivate: [authGuard] },
  { path: 'series', component: SeriesComponent, canActivate: [authGuard] },
  { path: 'profile/:id', component: ProfileComponent, canActivate: [authGuard] },
  { path: 'settings', component: SettingsComponent, canActivate: [authGuard] },
  { path: 'home', component: HomeComponent },
  { path: '**', redirectTo: 'browse' }
];
