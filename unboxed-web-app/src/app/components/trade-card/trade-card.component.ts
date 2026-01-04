import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TradeItem } from '../../models/trade-item.model';
import { TradeService } from '../../services/trade.service';

@Component({
  selector: 'app-trade-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './trade-card.component.html',
  styleUrl: './trade-card.component.css'
})
export class TradeCardComponent {
  @Input() item!: TradeItem;

  isFavourited = false;

  constructor(private tradeService: TradeService) {}

  toggleFavourite(event: Event) {
    event.stopPropagation();
    this.isFavourited = !this.isFavourited;
  }

  onProposeTrade() {
    this.tradeService.proposeTrade(this.item);
  }
}
