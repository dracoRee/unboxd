import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, BehaviorSubject, combineLatest, of } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { TradeItem } from '../models/trade-item.model';

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

  constructor(private http: HttpClient) {
    this.refreshCatalog();
  }

  refreshCatalog() {
    this.http.get<any[]>(`${this.apiUrl}/collection/1`).subscribe(series => {
      const allItems: TradeItem[] = [];
      series.forEach(s => {
        s.items.forEach((item: any) => {
          allItems.push({
            id: item.id.toString(),
            name: item.name,
            series: s.seriesName,
            rarity: item.rarity,
            referenceValue: item.referenceValue,
            imageUrl: item.imageUrl,
            isFeatured: item.referenceValue > 40,
            status: 'available'
          });
        });
      });
      this.itemsSubject.next(allItems);
    });
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
    // Return my items from the collection API
    return this.http.get<any[]>(`${this.apiUrl}/collection/1`).pipe(
      map(series => {
        const myItems: TradeItem[] = [];
        series.forEach(s => {
          s.items.filter((i: any) => i.isOwned).forEach((item: any) => {
            myItems.push({
              id: item.id.toString(),
              name: item.name,
              series: s.seriesName,
              rarity: item.rarity,
              referenceValue: item.referenceValue,
              imageUrl: item.imageUrl,
              isFeatured: item.referenceValue > 40,
              ownerId: '1'
            });
          });
        });
        return myItems;
      })
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
        id: item.id.toString(),
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
