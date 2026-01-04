import { Injectable } from '@angular/core';
import { Observable, of, Subject, BehaviorSubject, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
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
  private proposeTradeSource = new Subject<TradeItem>();
  proposeTrade$ = this.proposeTradeSource.asObservable();

  private mockItems: TradeItem[] = [
    {
      id: '1',
      name: 'Skullpanda Ancient Castle',
      series: 'Ancient Castle Series',
      rarity: 'Rare',
      referenceValue: 45,
      imageUrl: 'images/skullpanda_ancient_castle-series.webp',
      isFeatured: true,
      status: 'available'
    },
    {
      id: '2',
      name: 'Dimoo Aquarium',
      series: 'Aquarium Series',
      rarity: 'Common',
      referenceValue: 15,
      imageUrl: 'images/POP-MART-x-Ayan-Dimoo-World-Aquarium-Blind-Box-Series-The-Toy-Chronicle-rqrrq.avif',
      isFeatured: false,
      status: 'available'
    },
    {
      id: '3',
      name: 'Labubu The Monsters',
      series: 'The Monsters Art',
      rarity: 'Secret',
      referenceValue: 120,
      imageUrl: 'images/labubu.webp',
      isFeatured: true,
      status: 'available'
    },
    {
      id: '4',
      name: 'Molly Space',
      series: 'Space Series',
      rarity: 'Common',
      referenceValue: 18,
      imageUrl: 'images/2_u1FsNpkpVA_1200x1200.webp',
      isFeatured: false,
      status: 'available'
    },
    {
      id: '5',
      name: 'Hirono Little Mischief',
      series: 'Little Mischief',
      rarity: 'Rare',
      referenceValue: 50,
      imageUrl: 'images/hirono.jpg',
      isFeatured: false,
      status: 'available'
    }
  ];

  private myCollection: TradeItem[] = [
    {
      id: '101',
      name: 'Crybaby Crying Parade',
      series: 'Crying Parade',
      rarity: 'Common',
      referenceValue: 16,
      imageUrl: 'images/crybaby_crying_parade.avif',
      isFeatured: false,
      ownerId: 'me',
      status: 'available'
    },
    {
      id: '102',
      name: 'Pucky Forest',
      series: 'Forest Party',
      rarity: 'Common',
      referenceValue: 14,
      imageUrl: 'images/pucky_forest.webp',
      isFeatured: false,
      ownerId: 'me',
      status: 'available'
    }
  ];

  private itemsSubject = new BehaviorSubject<TradeItem[]>(this.mockItems);
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
        const matchesValue = !filters.maxValue || item.referenceValue <= filters.maxValue;
        
        // Mocking category logic
        let matchesCategory = true;
        if (filters.category === 'Series') matchesCategory = !!item.series;
        if (filters.category === 'Characters') matchesCategory = !!item.name;
        if (filters.category === 'My Collection') matchesCategory = item.ownerId === 'me';

        return matchesSearch && matchesSeries && matchesRarity && matchesValue && matchesCategory;
      });
    })
  );

  constructor() { }

  getTradeItems(): Observable<TradeItem[]> {
    return this.filteredItems$;
  }

  getFeaturedItems(): Observable<TradeItem[]> {
    return this.itemsSubject.pipe(
      map(items => items.filter(item => item.isFeatured))
    );
  }

  getMyCollection(): Observable<TradeItem[]> {
    return of(this.myCollection);
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
}
