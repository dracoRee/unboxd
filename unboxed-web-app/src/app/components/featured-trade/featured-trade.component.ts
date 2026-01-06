import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TradeService } from '../../services/trade.service';
import { TradeItem } from '../../models/trade-item.model';

@Component({
  selector: 'app-featured-trade',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './featured-trade.component.html',
  styleUrl: './featured-trade.component.css'
})
export class FeaturedTradeComponent implements OnInit {
  featuredItem?: TradeItem;

  constructor(private tradeService: TradeService) {}

  ngOnInit(): void {
    this.tradeService.getFeaturedItems().subscribe((items: TradeItem[]) => {
      if (items.length > 0) {
        this.featuredItem = items[0];
      }
    });
  }

  onProposeTrade() {
    if (this.featuredItem) {
      this.tradeService.proposeTrade(this.featuredItem);
    }
  }
}
