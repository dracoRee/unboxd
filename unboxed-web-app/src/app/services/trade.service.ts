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
        const matchesValue = filters.maxValue === undefined || item.referenceValue <= filters.maxValue;
        
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
   */
  refreshCatalog() {
    from(this.supabaseService.getItems()).pipe(
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
    // Handle either raw Collectible or join result
    const collectible = item.Collectible || item;
    const series = collectible.Series || item.Series;
    
    return {
      item_id: collectible.id?.toString() || '',
      name: collectible.name,
      series: series?.name || 'Unknown Series',
      rarity: collectible.rarity,
      referenceValue: collectible.referenceValue,
      imageUrl: this.supabaseService.getImageUrl(collectible.imageUrl, true),
      isFeatured: collectible.referenceValue > 40,
      status: collectible.status || 'available'
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
          imageUrl: this.supabaseService.getImageUrl(row.imageUrl, true),
          isFeatured: false,
          status: 'available' as 'available' | 'pending' | 'traded',
          ownerId: row.userId.toString()
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

  sendTradeOffer(receiverId: number, targetItemId: number, offeredItemIds: number[]): Observable<any> {
    const proposerId = this.authService.backendUser()?.id || 1; // Fallback to 1 if not synced yet
    return this.http.post(`${this.apiUrl}/trades`, {
      proposerId,
      receiverId,
      targetItemId,
      offeredItemIds
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
