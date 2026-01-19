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
  @Input() showFavourite: boolean = true;

  isImageZoomed = false;

  constructor(
    private tradeService: TradeService,
    private authService: AuthService
  ) {}

  toggleFavourite(event: Event) {
    event.stopPropagation();
    const userId = this.authService.backendUser()?.id || 1;
    // Use item_id which represents the listing ID for wishlisting
    const targetId = this.item.item_id;

    // Optimistically update the UI immediately
    this.item.isFavourited = !this.item.isFavourited;

    if (this.item.isFavourited) {
      this.tradeService.addToWishlist(userId, targetId).subscribe({
        next: () => {
          // Successfully added to wishlist
        },
        error: (err) => {
          console.error('Failed to wishlist', err);
          // Revert optimistic update on error
          this.item.isFavourited = !this.item.isFavourited;
        }
      });
    } else {
      this.tradeService.removeFromWishlist(userId, targetId).subscribe({
        next: () => {
          // Successfully removed from wishlist
        },
        error: (err) => {
          console.error('Failed to remove from wishlist', err);
          // Revert optimistic update on error
          this.item.isFavourited = !this.item.isFavourited;
        }
      });
    }
  }

  onProposeTrade() {
    this.tradeService.proposeTrade(this.item);
  }

  onCardClick(item: TradeItem) {
    // For example, open the trade modal:
    this.tradeService.proposeTrade(item);
  }

  toggleImageZoom(event?: Event) {
    if (event) event.stopPropagation(); // prevent card click
    this.isImageZoomed = !this.isImageZoomed;
  }

}
