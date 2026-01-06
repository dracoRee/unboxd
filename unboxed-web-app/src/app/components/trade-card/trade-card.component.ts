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
    if (!this.isFavourited) {
      this.tradeService.addToWishlist(1, parseInt(this.item.item_id)).subscribe({
        next: () => this.isFavourited = true,
        error: (err) => console.error('Failed to wishlist', err)
      });
    } else {
      this.tradeService.removeFromWishlist(1, parseInt(this.item.item_id)).subscribe({
        next: () => this.isFavourited = false,
        error: (err) => console.error('Failed to remove from wishlist', err)
      });
    }
  }

  onProposeTrade() {
    this.tradeService.proposeTrade(this.item);
  }
}
