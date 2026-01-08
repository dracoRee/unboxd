import { Routes } from '@angular/router';
import { ChatPageComponent } from './pages/chat-page/chat-page.component';
import { BrowseComponent } from './pages/browse/browse.component';
import { TradesComponent } from './pages/trades/trades.component';
import { WishlistComponent } from './pages/wishlist/wishlist.component';
import { InboxComponent } from './pages/inbox/inbox.component';
import { MyCollectionComponent } from './pages/my-collection/my-collection.component';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { ForgotPasswordComponent } from './pages/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './pages/reset-password/reset-password.component';
import { authGuard } from './guards/auth.guard';
import { HomeComponent } from '../../config/Home';

export const routes: Routes = [
  { path: '', redirectTo: 'browse', pathMatch: 'full' },
  { path: 'chat', component: ChatPageComponent, canActivate: [authGuard] },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  { path: 'browse', component: BrowseComponent, canActivate: [authGuard] },
  { path: 'trades', component: TradesComponent, canActivate: [authGuard] },
  { path: 'wishlist', component: WishlistComponent, canActivate: [authGuard] },
  { path: 'inbox', component: InboxComponent, canActivate: [authGuard] },
  { path: 'my-collection', component: MyCollectionComponent, canActivate: [authGuard] },
  { path: 'home', component: HomeComponent },
  { path: '**', redirectTo: 'browse' }
];
