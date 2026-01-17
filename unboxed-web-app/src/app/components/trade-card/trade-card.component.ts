import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TradeItem } from '../../models/trade-item.model';
import { TradeService } from '../../services/trade.service';
import { AuthService } from '../../services/auth.service';

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
  isImageZoomed = false;

  constructor(
    private tradeService: TradeService,
    private authService: AuthService
  ) {}

  toggleFavourite(event: Event) {
    event.stopPropagation();
    const userId = this.authService.backendUser()?.id || 1;
    
    // Use collectible_id if present (for listings), fallback to item_id (legacy/raw collectible)
    const targetId = this.item.collectible_id ? parseInt(this.item.collectible_id) : parseInt(this.item.item_id);

    if (!this.isFavourited) {
      this.tradeService.addToWishlist(userId, targetId).subscribe({
        next: () => this.isFavourited = true,
        error: (err) => console.error('Failed to wishlist', err)
      });
    } else {
      this.tradeService.removeFromWishlist(userId, targetId).subscribe({
        next: () => this.isFavourited = false,
        error: (err) => console.error('Failed to remove from wishlist', err)
      });
    }
  }

  onProposeTrade() {
    this.tradeService.proposeTrade(this.item);
  }

  onCardClick(item: TradeItem) {
    console.log('Card clicked:', item);
    // For example, open the trade modal:
    this.tradeService.proposeTrade(item);
  }

  toggleImageZoom(event?: Event) {
    if (event) event.stopPropagation(); // prevent card click
    this.isImageZoomed = !this.isImageZoomed;
  }

}
