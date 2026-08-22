import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { TradeGridComponent } from './trade-grid.component';

describe('TradeGridComponent', () => {
  let component: TradeGridComponent;
  let fixture: ComponentFixture<TradeGridComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TradeGridComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TradeGridComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
