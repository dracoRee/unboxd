import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, BehaviorSubject, combineLatest, of, from } from 'rxjs';
import { map, switchMap, tap, catchError } from 'rxjs/operators';
import { TradeItem } from '../models/trade-item.model';
import { SupabaseService } from './supabase.service';

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
  private apiUrl = 'http://localhost:3000';
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
    private supabaseService: SupabaseService
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
    return {
      item_id: item.id?.toString() || item.item_id?.toString() || '',
      name: item.name,
      series: item.series,
      rarity: item.rarity,
      referenceValue: item.referenceValue,
      imageUrl: this.supabaseService.getImageUrl(item.imageUrl),
      isFeatured: item.isFeatured || item.referenceValue > 40,
      status: item.status || 'available'
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
    // For now, return featured items as "my collection" for demo purposes
    // In production, this would query a user_collection table in Supabase
    return this.itemsSubject.pipe(
      map(items => items.filter(item => item.isFeatured).map(item => ({
        ...item,
        ownerId: '1'
      })))
    );
  }

  updateFilters(newFilters: Partial<TradeFilters>) {
    this.filtersSubject.next({
      ...this.filtersSubject.value,
      ...newFilters
    });
  }

  proposeTrade(item: TradeItem) {
    this.proposeTradeSource.next(item);
  }

  sendTradeOffer(receiverId: number, targetItemId: number, offeredItemIds: number[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/trades`, {
      proposerId: 1, // Hardcoded for proto
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
    return this.http.get<any[]>(`${this.apiUrl}/wishlist/${userId}`).pipe(
      map(items => items.map(item => ({
        item_id: item.item_id.toString(),
        name: item.name,
        series: item.series.name,
        rarity: item.rarity,
        referenceValue: item.referenceValue,
        imageUrl: item.imageUrl,
        isFeatured: false
      })))
    );
  }

  addToWishlist(userId: number, collectibleId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/wishlist`, { userId, collectibleId });
  }

  removeFromWishlist(userId: number, collectibleId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/wishlist/${userId}/${collectibleId}`);
  }
}
