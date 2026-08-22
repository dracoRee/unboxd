import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { TradeCardComponent } from './trade-card.component';
import { TradeItem } from '../../models/trade-item.model';

const mockTradeItem: TradeItem = {
  item_id: 1,
  name: 'Mock Dimoo Figure',
  series: 'Dimoo World x Disney',
  rarity: 'common',
  referenceValue: 25,
  listingPrice: 25,
  imageUrl: '/images/placeholder.webp',
  isFeatured: false,
  description: 'A mock listing used for unit tests.',
  condition: 'BRAND_NEW',
  listedAt: new Date(),
  postedBy: { id: 1, name: 'Mock User' },
};

describe('TradeCardComponent', () => {
  let component: TradeCardComponent;
  let fixture: ComponentFixture<TradeCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TradeCardComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TradeCardComponent);
    component = fixture.componentInstance;
    component.item = mockTradeItem;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
