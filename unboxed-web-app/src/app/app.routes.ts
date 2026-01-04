import { Routes } from '@angular/router';
import { BrowseComponent } from './pages/browse/browse.component';
import { TradesComponent } from './pages/trades/trades.component';
import { WishlistComponent } from './pages/wishlist/wishlist.component';
import { InboxComponent } from './pages/inbox/inbox.component';

export const routes: Routes = [
  { path: '', redirectTo: 'browse', pathMatch: 'full' },
  { path: 'browse', component: BrowseComponent },
  { path: 'trades', component: TradesComponent },
  { path: 'wishlist', component: WishlistComponent },
  { path: 'inbox', component: InboxComponent },
  { path: '**', redirectTo: 'browse' }
];
