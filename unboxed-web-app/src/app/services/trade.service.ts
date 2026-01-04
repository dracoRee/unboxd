import { Injectable } from '@angular/core';
import { Observable, of, Subject } from 'rxjs';
import { TradeItem } from '../models/trade-item.model';

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
      imageUrl: 'images/097c128781f8e1f9dbc63229294df799.webp',
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
      imageUrl: 'https://popmart.com.au/cdn/shop/files/1_0004_Layer-5.jpg?v=1715326661&width=600',
      isFeatured: false,
      ownerId: 'me',
      status: 'available'
    }
  ];

  constructor() { }

  getTradeItems(): Observable<TradeItem[]> {
    return of(this.mockItems);
  }

  getFeaturedItems(): Observable<TradeItem[]> {
    return of(this.mockItems.filter(item => item.isFeatured));
  }

  getMyCollection(): Observable<TradeItem[]> {
    return of(this.myCollection);
  }

  proposeTrade(item: TradeItem) {
    this.proposeTradeSource.next(item);
  }
}
