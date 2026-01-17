import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, BehaviorSubject, combineLatest, of, from } from 'rxjs';
import { map, switchMap, tap, catchError } from 'rxjs/operators';
import { TradeItem } from '../models/trade-item.model';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { environment } from '@/environments/environment';

const host_url = environment.apiBaseUrl;

export interface TradeFilters {
  search?: string;
  category?: string;
  series?: string[];
  rarity?: string[];
  maxValue?: number;
}

@Injectable({
  providedIn: 'root'
})
export class TradeService {
  private apiUrl = host_url;
  private proposeTradeSource = new Subject<TradeItem>();
  proposeTrade$ = this.proposeTradeSource.asObservable();

  private itemsSubject = new BehaviorSubject<TradeItem[]>([]);
  private filtersSubject = new BehaviorSubject<TradeFilters>({
    search: '',
    category: 'All',
    series: [],
    rarity: [],
    maxValue: 500
  });
  filters$ = this.filtersSubject.asObservable();

  filteredItems$ = combineLatest([this.itemsSubject, this.filtersSubject]).pipe(
    map(([items, filters]) => {
      return items.filter(item => {
        const matchesSearch = !filters.search || 
          item.name.toLowerCase().includes(filters.search.toLowerCase()) ||
          item.series.toLowerCase().includes(filters.search.toLowerCase());
        
        const matchesSeries = !filters.series?.length || filters.series.includes(item.series);
        const matchesRarity = !filters.rarity?.length || filters.rarity.includes(item.rarity);
        const matchesValue = filters.maxValue === undefined || item.referenceValue === undefined || item.referenceValue <= filters.maxValue;
        
        // Mocking category logic for now
        let matchesCategory = true;
        if (filters.category === 'Series') matchesCategory = !!item.series;
        if (filters.category === 'Characters') matchesCategory = !!item.name;

        return matchesSearch && matchesSeries && matchesRarity && matchesValue && matchesCategory;
      });
    })
  );

  constructor(
    private http: HttpClient,
    private supabaseService: SupabaseService,
    private authService: AuthService
  ) {
    this.refreshCatalog();
  }

  /**
   * Refresh catalog by fetching items directly from Supabase
   * Now fetches valid UserListings instead of raw collectibles
   */
  refreshCatalog() {
    from(this.supabaseService.getAvailableListings()).pipe(
      map(items => items.map(item => this.mapToTradeItem(item))),
      catchError(error => {
        console.error('Error fetching items from Supabase:', error);
        return of([]);
      })
    ).subscribe(items => {
      this.itemsSubject.next(items);
    });
  }

  /**
   * Map Supabase item to TradeItem model
   */
  private mapToTradeItem(item: any): TradeItem {
    console.table(item);
    // If item has a nested Collectible, it's likely a UserListing or UserCollectible
    // The getAvailableListings returns UserListing with nested Collectible
    // But getWishlist returns Collectible directly (mapped previously) or UserWishlist which has Collectible nested
    
    // We need to handle:
    // 1. UserListing (from browse) -> has .Collectible
    // 2. Collectible (from wishlist if mapped directly?) 
    //    Actually getWishlist maps: `data.map(row => this.mapToTradeItem(row.Collectible))`
    //    So for Wishlist, 'item' IS the Collectible object.
    
    let collectible: any;
    let listingId = '';
    let ownerId: string | undefined;
    let ownerName: string | undefined;
    let ownerAvatar: string | undefined;

    if (item.Collectible) {
      // It's a UserListing (or similar wrapper)
      collectible = item.Collectible;
      listingId = item.id?.toString() || '';
      // UserListing joins User
      if (item.User) {
        ownerId = item.User.id?.toString();
        ownerName = item.User.name;
        ownerAvatar = item.User.profilePicture;
      } else {
        // Fallback or explicit userId field
        ownerId = item.userId?.toString();
      }
    } else {
      // It's a raw Collectible (e.g. from wishlist mapping)
      collectible = item;
      // For raw collectibles, we don't have a specific listing ID, so we use collectible ID as fallback
      // ideally explicit listing ID is better but this maintains back-compat for wishlist view
      listingId = collectible.id?.toString() || ''; 
    }

    // Safety check if collectible is null (shouldn't happen with correct data)
    if (!collectible) {
      console.warn('Invalid item structure in mapToTradeItem', item);
      return {
        item_id: '',
        name: 'Unknown Item',
        series: 'Unknown',
        rarity: 'Unknown',
        referenceValue: 0,
        listingPrice: 0,
        imageUrl: '',
        isFeatured: false,
        description: collectible.description || 'No Available Description.',
        condition: collectible.condition || 'No Available Condition.',
        listedAt: collectible.createdAt ? new Date(collectible.createdAt) : new Date(),
        postedBy: {
          id: collectible.userId || 0,
          name: collectible.User?.name || 'Unknown User',
          profilePicture: collectible.User?.profilePicture
        }
      };
    }

    const series = collectible.Series || item.Series; // fallback if Series is on root (unlikely for UserListing)
    
    return {
      item_id: listingId,
      collectible_id: collectible.id?.toString(),
      listingTitle: item.title,
      name: collectible.name,
      series: series?.name || 'Unknown Series',
      rarity: collectible.rarity,
      referenceValue: collectible.referenceValue || 0,
      listingPrice: item.listingPrice || 0,
      imageUrl: item.imageUrl,
      isFeatured: collectible.referenceValue > 40,
      status: collectible.status || 'available',
      description: item.description || 'No Available Description.',
      condition: item.condition || 'No Available Condition.',
      listedAt: item.createdAt ? new Date(item.createdAt) : new Date(),
      postedBy: {
        id: item.userId || 0,
        name: item.User?.name || 'Unknown User',
        profilePicture: item.User?.profilePicture
      }
    };
  }

  getTradeItems(): Observable<TradeItem[]> {
    return this.filteredItems$;
  }

  getFeaturedItems(): Observable<TradeItem[]> {
    return this.itemsSubject.pipe(
      map(items => items.filter(item => item.isFeatured))
    );
  }

  getMyCollection(): Observable<TradeItem[]> {
    const user = this.authService.currentUser();
    if (!user) return of([]);

    // Note: UserCollectible relates to Series, not Collectible
    // UserCollectible has its own name and imageUrl fields
    return from(this.supabaseService.getUserCollection(user.id)).pipe(
      map(data => data.map(row => {
        // UserCollectible has: id, userId, seriesId, name, imageUrl, Series
        const series = row.Series;
        const tradeItem: TradeItem = {
          item_id: row.id?.toString() || '',
          name: row.name || 'Unnamed Item',
          series: series?.name || 'Unknown Series',
          rarity: 'Unknown', // UserCollectible doesn't have rarity, would need to join with Collectible if needed
          referenceValue: 0, // UserCollectible doesn't have referenceValue
          listingPrice: 0,
          imageUrl: this.supabaseService.getImageUrl(row.imageUrl, true),
          isFeatured: false,
          status: 'available' as 'available' | 'pending' | 'traded',
          ownerId: row.userId.toString(),
          description: row.description || 'No Available Description.',
          condition: row.condition || 'No Available Condition.',
          listedAt: row.createdAt ? new Date(row.createdAt) : new Date(),
          postedBy: {
            id: row.userId || 0,
            name: row.User?.name || 'Unknown User',
            profilePicture: row.User?.profilePicture
          }
        };
        return tradeItem;
      })),
      catchError(error => {
        console.error('Error in getMyCollection:', error);
        return of([]);
      })
    );
  }

  updateFilters(newFilters: Partial<TradeFilters>) {
    this.filtersSubject.next({
      ...this.filtersSubject.value,
      ...newFilters
    });
  }

  resetFilters() {
    this.filtersSubject.next({
      search: '',
      category: 'All',
      series: [],
      rarity: [],
      maxValue: 500
    });
  }

  proposeTrade(item: TradeItem) {
    this.proposeTradeSource.next(item);
  }

  sendTradeOffer(receiverId: number, targetItemId: number, offeredItemIds: number[], buyerPaysCash: boolean, cashTopUp: number): Observable<any> {
    const proposerId = this.authService.backendUser()?.id || 1; // Fallback to 1 if not synced yet
    return this.http.post(`${this.apiUrl}/trades`, {
      proposerId,
      receiverId,
      targetItemId,
      offeredItemIds,
      buyerPaysCash,
      cashTopUp
    });
  }

  getUserTrades(userId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/trades/${userId}`);
  }

  updateTradeStatus(tradeId: number, status: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/trades/${tradeId}`, { status });
  }

  // Wishlist
  getWishlist(userId: number): Observable<TradeItem[]> {
    return from(this.supabaseService.getUserWishlist(userId)).pipe(
      map(data => data.map(row => this.mapToTradeItem(row.Collectible))),
      catchError(error => {
        console.error('Error in getWishlist:', error);
        return of([]);
      })
    );
  }

  addToWishlist(userId: number, collectibleId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/wishlist`, { userId, collectibleId });
  }

  removeFromWishlist(userId: number, collectibleId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/wishlist/${userId}/${collectibleId}`);
  }
}
