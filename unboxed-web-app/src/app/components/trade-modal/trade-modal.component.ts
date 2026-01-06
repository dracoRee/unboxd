import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TradeItem } from '../../models/trade-item.model';
import { TradeService } from '../../services/trade.service';

@Component({
  selector: 'app-trade-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './trade-modal.component.html',
  styleUrl: './trade-modal.component.css'
})
export class TradeModalComponent implements OnInit {
  @Input() targetItem!: TradeItem;
  @Output() close = new EventEmitter<void>();
  @Output() tradeSent = new EventEmitter<any>();

  myCollection: TradeItem[] = [];
  selectedItems: Set<string> = new Set();

  constructor(private tradeService: TradeService) {}

  ngOnInit(): void {
    this.tradeService.getMyCollection().subscribe(items => {
      this.myCollection = items;
    });
  }

  toggleSelection(itemId: string) {
    if (this.selectedItems.has(itemId)) {
      this.selectedItems.delete(itemId);
    } else {
      this.selectedItems.add(itemId);
    }
  }

  get totalOfferedValue(): number {
    return this.myCollection
      .filter(item => this.selectedItems.has(item.item_id))
      .reduce((sum, item) => sum + item.referenceValue, 0);
  }

  get valueComparison(): 'Fair' | 'Under' | 'Over' {
    const diff = this.totalOfferedValue - this.targetItem.referenceValue;
    if (Math.abs(diff) <= 5) return 'Fair';
    return diff > 0 ? 'Over' : 'Under';
  }

  sendOffer() {
    if (this.selectedItems.size === 0) return;
    
    const offeredIds = Array.from(this.selectedItems).map(id => parseInt(id));
    // For demo/prototype, receiverId is assumed based on common practices or hardcoded to another test user
    const receiverId = 2; // Hypothetical second user in the seed

    this.tradeService.sendTradeOffer(receiverId, parseInt(this.targetItem.item_id), offeredIds).subscribe({
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
}
