import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TradeItem } from '../../models/trade-item.model';
import { TradeService } from '../../services/trade.service';
import { MessagingService } from '../../services/messaging.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-trade-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './trade-modal.component.html',
  styleUrl: './trade-modal.component.css'
})
export class TradeModalComponent implements OnInit {
  @Input() targetItem!: TradeItem;
  @Output() close = new EventEmitter<void>();
  @Output() tradeSent = new EventEmitter<any>();

  atSymbol = '@';
  myCollection: TradeItem[] = [];
  selectedItems: Set<number> = new Set();
  showImageZoom = false;
  cashTopUp = 0;
  showFullDescription = false;
  buyerPaysCash = true;

  constructor(
    private tradeService: TradeService,
    private messagingService: MessagingService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.tradeService.getMyCollection().subscribe(items => {
      this.myCollection = items;
    });
  }

  toggleSelection(item: TradeItem) {
    const listingId = Number(item.item_id);

    if (!listingId) {
      console.warn('Item missing item_id', item);
      return;
    }

    if (this.selectedItems.has(listingId)) {
      this.selectedItems.delete(listingId);
    } else {
      this.selectedItems.add(listingId);
    }
  }


  toggleImageZoom() {
    this.showImageZoom = !this.showImageZoom;
  }

  get totalOfferedValue(): number {
    const itemsValue = this.myCollection
      .filter(item => this.selectedItems.has(Number(item.item_id)))
      .reduce((sum, item) => sum + item.referenceValue, 0);
    return itemsValue + (this.buyerPaysCash ? this.cashTopUp : -this.cashTopUp);
  }

  get cashAmount(): number {
    return Math.abs(this.cashTopUp);
  }

  get displayOfferValue(): number {
    return this.totalOfferedValue;
  }

  get formattedOfferValue(): string {
    const value = this.totalOfferedValue;
    const sign = value < 0 ? '-' : '';
    const absValue = Math.abs(value);
    return `${sign}RM${absValue}`;
  }

  addCash() {
    this.cashTopUp = this.targetItem.referenceValue;
  }

  onCashInputChange() {
    if (this.cashTopUp < 0) {
      this.cashTopUp = Math.abs(this.cashTopUp);
    }
  }

  get valueComparison(): 'Fair' | 'Under' | 'Over' | 'Too Low!' {
    const offeredValue = this.totalOfferedValue;
    const targetValue = this.targetItem.referenceValue;
    
    // Check if offer is less than 65% of target value
    if (offeredValue < targetValue * 0.65) {
      return 'Too Low!';
    }
    
    const diff = offeredValue - targetValue;
    if (Math.abs(diff) <= 5) return 'Fair';
    return diff > 0 ? 'Over' : 'Under';
  }

  getRelativeTime(date: Date): string {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffMs = now.getTime() - date.getTime();

    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    // Within 1 hour → minutes
    if (diffMinutes < 60) {
      return diffMinutes <= 1
        ? 'just now'
        : `${diffMinutes} minutes ago`;
    }

    // Within 24 hours → hours
    if (diffHours < 24) {
      return diffHours === 1
        ? '1 hour ago'
        : `${diffHours} hours ago`;
    }

    if (diffDays < 7) {
      return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return months === 1 ? '1 month ago' : `${months} months ago`;
    } else {
      const years = Math.floor(diffDays / 365);
      return years === 1 ? '1 year ago' : `${years} years ago`;
    }
  }

  sendOffer() {
    if (this.selectedItems.size === 0 && this.cashTopUp === 0) return;
    if (this.valueComparison === 'Too Low!') return;
    
    if (!this.targetItem.collectible_id) {
      alert('This item is not available for trade.');
      return;
    }
    
    const offeredIds = Array.from(
      new Set(
        this.myCollection
          .filter(item => this.selectedItems.has(Number(item.item_id)))
          .map(item => item.collectible_id)
          .filter((id): id is number => typeof id === 'number' && !Number.isNaN(id))
      )
    );

    if (offeredIds.length === 0 && this.cashTopUp === 0) {
      alert('Please select at least one valid item to offer.');
      return;
    }

    console.log('Sending offered collectible IDs:', offeredIds);
    
    // Use postedBy.id as receiver, since ownerId may not be set
    const receiverId = this.targetItem.postedBy.id;

    // Prevent trading with yourself
    if (receiverId === this.authService.backendUser()?.id) {
      alert('You cannot trade with yourself.');
      return;
    }
    
    // Backend expects Collectible ID for the target item
    const targetId = this.targetItem.collectible_id;

    this.tradeService.sendTradeOffer(receiverId, targetId, offeredIds, this.buyerPaysCash, this.cashTopUp).subscribe({
      next: (trade) => {
        this.tradeSent.emit(trade);
        this.close.emit();
      },
      error: (err) => {
        console.error('Failed to send trade', err);
        alert('Failed to send trade offer. Please try again.');
      }
    });
  }

  onChatWithSeller() {
    const buyerId = this.authService.backendUser()?.id;
    const sellerId = this.targetItem.postedBy.id;
    
    if (!buyerId) {
      alert('Please log in to chat with the seller');
      return;
    }

    if (buyerId === sellerId) {
      alert('You cannot chat with yourself');
      return;
    }

    this.messagingService.createConversation([buyerId, sellerId]).subscribe({
      next: (conv) => {
        this.close.emit();
        this.router.navigate(['/chat'], { queryParams: { convId: conv.id } });
      },
      error: (err) => {
        console.error('Failed to initiate chat', err);
        alert('Could not start conversation. Please try again.');
      }
    });
  }

  shouldShowReadMore(): boolean {
    return (this.targetItem.description?.length || 0) > 100;
  }
}
