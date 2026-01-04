import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FeaturedTradeComponent } from './featured-trade.component';

describe('FeaturedTradeComponent', () => {
  let component: FeaturedTradeComponent;
  let fixture: ComponentFixture<FeaturedTradeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FeaturedTradeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FeaturedTradeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
