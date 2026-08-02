import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, BehaviorSubject, combineLatest, of, from } from 'rxjs';
import { map, switchMap, tap, catchError } from 'rxjs/operators';
import { TradeItem } from '../models/trade-item.model';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { UserService } from './user.service';
import { environment } from '@/environments/environment';

const host_url = environment.apiBaseUrl;

export interface TradeFilters {
  search?: string;
  category?: string;
  series?: string[];
  rarity?: string[];
  maxValue?: number;
}

export interface SwapSuggestion {
  key: string;
  legs: Array<{
    fromUser: { id: number; username: string; name: string; profilePicture: string | null };
    toUser: { id: number; username: string; name: string; profilePicture: string | null };
    listing: {
      id: number;
      userId: number;
      collectibleId: number;
      title: string;
      imageUrl: string | null;
      seriesName: string | null;
      condition: string | null;
      referenceValue: number | null;
      collectibleName: string;
    };
  }>;
  rationale: string[];
}

@Injectable({
  providedIn: 'root'
})
export class TradeService {
  private apiUrl = host_url;
  private proposeTradeSource = new Subject<TradeItem>();
  proposeTrade$ = this.proposeTradeSource.asObservable();

  private itemsSubject = new BehaviorSubject<TradeItem[]>([]);
  private wishlistSubject = new BehaviorSubject<TradeItem[]>([]);
  wishlist$ = this.wishlistSubject.asObservable();
  private filtersSubject = new BehaviorSubject<TradeFilters>({
    search: '',
    category: 'All',
    series: [],
    rarity: [],
    maxValue: 500
  });
  filters$ = this.filtersSubject.asObservable();

  private wishlistedIds = new Set<number>();

  filteredItems$ = combineLatest([this.itemsSubject, this.filtersSubject]).pipe(
    map(([items, filters]) => {
      return items.filter(item => {
        const search = filters.search?.toLowerCase() || '';
        const matchesSearch = !search ||
          (item.listingTitle && item.listingTitle.toLowerCase().includes(search)) ||
          (item.name && item.name.toLowerCase().includes(search)) ||
          (item.series && item.series.toLowerCase().includes(search));
        
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
    private authService: AuthService,
    private userService: UserService
  ) {
    this.refreshCatalog();
  }

  /**
   * Refresh catalog by fetching items directly from Supabase
   * Now fetches valid UserListings instead of raw collectibles
   */
  refreshCatalog() {
    this.refreshWishlistStatus().pipe(
      switchMap(() => from(this.supabaseService.getAvailableListings())),
      map(items => items.map(item => this.mapToTradeItem(item))),
      catchError(error => {
        console.error('Error fetching items from Supabase:', error);
        return of([]);
      })
    ).subscribe(items => {
      this.itemsSubject.next(items);
    });
  }

  private refreshWishlistStatus(): Observable<void> {
    const userId = this.authService.backendUser()?.id;
    if (!userId) {
      this.wishlistedIds.clear();
      this.syncWishlistedItems();
      return of(undefined);
    }

    return this.http.get<any[]>(`${this.apiUrl}/wishlist/${userId}`).pipe(
      map(listings => {
        this.wishlistedIds.clear();
        const mappedListings = listings.map(listing => this.mapToTradeItem(listing));
        mappedListings.forEach(item => {
          if (item.item_id) this.wishlistedIds.add(item.item_id);
        });
        this.wishlistSubject.next(mappedListings);
        this.syncWishlistedItems();
      }),
      catchError(error => {
        console.error('Failed to refresh wishlist status', error);
        return of(undefined);
      })
    );
  }

  private syncWishlistedItems() {
    const currentItems = this.itemsSubject.value;
    const updatedItems = currentItems.map(item => ({
      ...item,
      isFavourited: this.wishlistedIds.has(item.item_id)
    }));
    this.itemsSubject.next(updatedItems);
  }

  /**
   * Map Supabase item to TradeItem model
   */
  private mapToTradeItem(item: any): TradeItem {
    //console.table(item);
    // Supabase returns 'user' (lowercase) due to alias in query
    const userData = item.User || item.user;
    //// console.log('User data:', JSON.stringify(userData, null, 2));
    // If item has a nested Collectible, it's likely a UserListing or UserCollectible
    // The getAvailableListings returns UserListing with nested Collectible
    // But getWishlist returns Collectible directly (mapped previously) or UserWishlist which has Collectible nested
    
    // We need to handle:
    // 1. UserListing (from browse) -> has .Collectible
    // 2. Collectible (from wishlist if mapped directly?) 
    //    Actually getWishlist maps: `data.map(row => this.mapToTradeItem(row.Collectible))`
    //    So for Wishlist, 'item' IS the Collectible object.
    
    let collectible: any;
    let listingId: number = 0;
    let ownerId: string | undefined;
    let ownerName: string | undefined;
    let ownerAvatar: string | undefined;
    let ownerUsername: string | undefined;

    const isListing = !!(item.Collectible || item.collectible)
      || 'collectibleId' in item
      || 'serialNumber' in item
      || 'isAvailableForTrade' in item
      || 'dealMethods' in item;

    if (isListing) {
      // It's a UserListing (or similar wrapper)
      collectible = item.Collectible || item.collectible || null;
      listingId = parseInt(item.id) || 0;
      
      // Handle user information
      // 1. Check for PublicUser at the root (from getAvailableListings)
      // 2. Check for User/user object (legacy or other queries)
      
      const publicUserObj = item.PublicUser || item.publicUser;
      if (publicUserObj) {
        ownerId = publicUserObj.id?.toString();
        ownerName = publicUserObj.name;
        ownerUsername = publicUserObj.username;
        ownerAvatar = publicUserObj.profilePicture;

        // Also check nested user object (User table) for fallback data
        const userObj = publicUserObj.user || publicUserObj.User;
        if (userObj) {
          ownerName = ownerName || userObj.name;
          ownerAvatar = ownerAvatar || userObj.profilePicture;
          ownerUsername = ownerUsername || userObj.username;
        }
      } else {
        const userObj = item.User || item.user;
        if (userObj) {
          ownerId = userObj.id?.toString();
          ownerName = userObj.name;
          ownerUsername = userObj.username;
          // Prefer PublicUser profile picture if available (nested under User)
          // Check if PublicUser is an array or object (Supabase relation might return array for one-to-one sometimes, or obj)
          const publicUser = Array.isArray(userObj.PublicUser) ? userObj.PublicUser[0] : userObj.PublicUser;
          ownerAvatar = publicUser?.profilePicture || userObj.profilePicture;
          if (publicUser?.username) {
            ownerUsername = publicUser.username;
          }
          if (publicUser?.name) {
            ownerName = publicUser.name;
          }
        } else {
          // Fallback or explicit userId field
          ownerId = item.userId?.toString();
        }
      }
    } else {
      // It's a raw Collectible (e.g. from wishlist mapping)
      collectible = item;
      // For raw collectibles, we don't have a specific listing ID, so we use collectible ID as fallback
      // ideally explicit listing ID is better but this maintains back-compat for wishlist view
      listingId = parseInt(collectible.id) || 0; 
    }

    // Safety check if collectible is null (shouldn't happen with correct data)
    if (!collectible && !isListing) {
      console.warn('Invalid item structure in mapToTradeItem', item);
      return {
        item_id: 0,
        name: 'Unknown Item',
        series: 'Unknown',
        rarity: 'Unknown',
        referenceValue: 0,
        listingPrice: 0,
        imageUrl: '',
        isFeatured: false,
        description: 'No Available Description.',
        condition: 'No Available Condition.',
        listedAt: new Date(),
        postedBy: {
          id: 0,
          name: 'Unknown User',
          username: undefined,
          profilePicture: undefined
        }
      };
    }

    const series = collectible?.Series || collectible?.series || item.Series || item.series; // fallback if Series is on root
    const userObj = item.User || item.user;
    const resolvedName = userObj?.name || ownerName || `User_${item.userId ?? collectible?.userId ?? 'NA'}`;
    const resolvedAvatar = ownerAvatar;
    const resolvedUsername = ownerUsername;
    const resolvedUserId = item.userId || collectible?.userId || 0;
    const rawCollectibleId = collectible?.id ?? item.collectibleId ?? item.collectible_id;
    const parsedCollectibleId = rawCollectibleId !== undefined && rawCollectibleId !== null
      ? parseInt(rawCollectibleId)
      : undefined;
    const collectibleId = parsedCollectibleId && !Number.isNaN(parsedCollectibleId)
      ? parsedCollectibleId
      : undefined;
    const itemName = collectible?.name || item.name || item.title || 'Unnamed Item';
    const seriesName = series?.name || item.seriesName || 'Unknown Series';
    const rarity = collectible?.rarity || item.rarity || 'Unknown';
    const referenceValue = collectible?.referenceValue || item.referenceValue || 0;
    const listingPrice = item.listingPrice || item.referenceValue || collectible?.referenceValue || 0;
    const imageUrl = item.imageUrl || collectible?.imageUrl || '';
    const description = item.description || collectible?.description || 'No Available Description.';
    const condition = item.condition || collectible?.condition || 'No Available Condition.';
    const listedAt = item.createdAt
      ? new Date(item.createdAt)
      : (collectible?.createdAt ? new Date(collectible.createdAt) : new Date());
    
    return {
      item_id: listingId,
      isFavourited: this.wishlistedIds.has(listingId),
      vouchCount: parseInt(item.vouchCount) || 0,
      hasVouched: item.hasVouched || false,
      collectible_id: collectibleId,
      listingTitle: item.title,
      name: itemName,
      series: seriesName,
      rarity,
      referenceValue,
      listingPrice,
      imageUrl,
      isFeatured: (referenceValue || 0) > 40,
      status: item.status?.toLowerCase() || collectible?.status?.toLowerCase() || 'available',
      description,
      condition,
      listedAt,
      postedBy: {
        id: resolvedUserId,
        name: resolvedName,
        username: resolvedUsername,
        profilePicture: resolvedAvatar
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
    const user = this.authService.backendUser();
    if (!user) return of([]);

    return this.userService.getUserListings(user.id).pipe(
      map(listings => listings
        .filter(listing => !!listing.collectibleId)
        .map(listing => {
          const imageUrl = listing.imageUrl
            ? (listing.imageUrl.startsWith('http')
              ? listing.imageUrl
              : this.supabaseService.getImageUrl(listing.imageUrl, true))
            : '';

          const tradeItem: TradeItem = {
            item_id: listing.id,
            collectible_id: listing.collectibleId || undefined,
            name: listing.collectible?.name || listing.title || 'Unnamed Item',
            series: listing.collectible?.series?.name || listing.seriesName || 'Unknown Series',
            rarity: listing.collectible?.rarity || 'Unknown',
            referenceValue: listing.referenceValue || 0,
            listingPrice: listing.referenceValue || 0,
            imageUrl,
            isFeatured: (listing.referenceValue || 0) > 40,
            status: listing.isAvailableForTrade ? 'available' : 'pending',
            ownerId: listing.userId.toString(),
            description: listing.description || 'No Available Description.',
            condition: listing.condition || 'No Available Condition.',
            listedAt: listing.createdAt ? new Date(listing.createdAt) : new Date(),
            postedBy: {
              id: listing.userId,
              name: user.name || 'Unknown User',
              username: user.username,
              profilePicture: user.profilePicture
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

  updateTradeStatusWithGuard(tradeId: number, status: string, expectedStatus?: string, version?: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/trades/${tradeId}`, {
      status,
      expectedStatus,
      version
    });
  }

  updateTradeChecklist(tradeId: number, checklist: Record<string, boolean>, verificationStatus: string, version?: number, actorId?: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/trades/${tradeId}/checklist`, {
      checklist,
      verificationStatus,
      version,
      actorId
    });
  }

  confirmTradeCompletion(tradeId: number, version: number, actorId?: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/trades/${tradeId}/confirm`, {
      actorId,
      version
    });
  }

  getSwapSuggestions(userId: number): Observable<SwapSuggestion[]> {
    return this.http.get<{ suggestions: SwapSuggestion[] }>(`${this.apiUrl}/swaps/suggestions/${userId}`).pipe(
      map(response => response.suggestions || [])
    );
  }

  // Wishlist
  getWishlist(userId: number): Observable<TradeItem[]> {
    this.refreshWishlistStatus().subscribe();
    return this.wishlist$;
  }

  addToWishlist(userId: number, listingId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/wishlist`, { userId, listingId }).pipe(
      tap(() => {
        this.wishlistedIds.add(listingId);
        this.updateItemFavouritedStatus(listingId, true);
        this.refreshWishlistStatus().subscribe();
      })
    );
  }

  removeFromWishlist(userId: number, listingId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/wishlist/${userId}/${listingId}`).pipe(
      tap(() => {
        this.wishlistedIds.delete(listingId);
        this.updateItemFavouritedStatus(listingId, false);
        this.refreshWishlistStatus().subscribe();
      })
    );
  }

  private updateItemFavouritedStatus(listingId: number, isFavourited: boolean) {
    const currentItems = this.itemsSubject.value;
    const updatedItems = currentItems.map(item => {
      if (item.item_id === listingId) {
        return { ...item, isFavourited };
      }
      return item;
    });
    this.itemsSubject.next(updatedItems);
  }
}
