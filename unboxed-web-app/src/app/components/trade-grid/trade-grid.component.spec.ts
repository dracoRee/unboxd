import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TradeGridComponent } from './trade-grid.component';

describe('TradeGridComponent', () => {
  let component: TradeGridComponent;
  let fixture: ComponentFixture<TradeGridComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TradeGridComponent]
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
