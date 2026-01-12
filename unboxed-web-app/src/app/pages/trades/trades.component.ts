import { Component, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TradeService } from '../../services/trade.service';
import { AuthService } from '../../services/auth.service';
import { ChatComponent } from '../../components/chat/chat.component';

@Component({
  selector: 'app-trades',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container mx-auto px-4 py-8">
      <h1 class="text-3xl font-bold mb-8">Trade Management</h1>

      <div class="flex gap-4 mb-8">
        <button (click)="activeTab = 'outgoing'" 
                [class.bg-indigo-600]="activeTab === 'outgoing'"
                [class.text-white]="activeTab === 'outgoing'"
                class="px-6 py-2 rounded-full font-semibold border border-indigo-600 transition-all">
          My Offers
        </button>
        <button (click)="activeTab = 'incoming'" 
                [class.bg-indigo-600]="activeTab === 'incoming'"
                [class.text-white]="activeTab === 'incoming'"
                class="px-6 py-2 rounded-full font-semibold border border-indigo-600 transition-all">
          Received Offers
        </button>
      </div>

      <div class="grid grid-cols-1 gap-6">
        @for (trade of filteredTrades; track trade.id) {
          <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              
              <!-- Left: Target Item -->
              <div class="flex items-center gap-4">
                <img [src]="trade.targetItem.imageUrl" class="w-16 h-16 rounded-lg object-cover">
                <div>
                  <p class="text-xs text-gray-500 font-bold uppercase tracking-wider">Requested Item</p>
                  <h3 class="font-bold">{{ trade.targetItem.name }}</h3>
                </div>
              </div>

              <!-- Center: Swap Icon -->
              <div class="flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>

              <!-- Right: Offered Items -->
              <div class="flex -space-x-4">
                @for (offer of trade.offeredItems; track offer.id) {
                  <img [src]="offer.collectible.imageUrl" 
                       class="w-12 h-12 rounded-full border-2 border-white shadow-sm object-cover"
                       [title]="offer.collectible.name">
                }
              </div>

            <!-- Status & Actions -->
            <div class="flex items-center gap-4 min-w-[200px] justify-end">
                <span [class.bg-yellow-100]="trade.status === 'PENDING'"
                      [class.text-yellow-700]="trade.status === 'PENDING'"
                      [class.bg-green-100]="trade.status === 'ACCEPTED'"
                      [class.text-green-700]="trade.status === 'ACCEPTED'"
                      class="px-3 py-1 rounded-full text-xs font-bold uppercase">
                  {{ trade.status }}
                </span>

                @if (activeTab === 'incoming' && trade.status === 'PENDING') {
                  <div class="flex gap-2">
                    <button (click)="updateStatus(trade.id, 'ACCEPTED')" class="p-2 text-green-600 hover:bg-green-50 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                    <button (click)="updateStatus(trade.id, 'DECLINED')" class="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                }
            </div>
          </div>
        </div>
        } @empty {
          <div class="bg-gray-50 border-2 border-dashed border-gray-200 p-12 rounded-3xl text-center">
            <p class="text-gray-500">No {{ activeTab }} trades found.</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in {
      animation: fadeIn 0.3s ease-out;
    }
  `]
})
export class TradesComponent implements OnInit {
  trades: any[] = [];
  activeTab: 'outgoing' | 'incoming' = 'outgoing';
  userId?: number;
  activeChatTradeId: number | null = null;

  constructor(
    private tradeService: TradeService,
    private authService: AuthService
  ) {
    effect(() => {
      this.userId = this.authService.backendUser()?.id;
      if (this.userId) {
        this.loadTrades();
      }
    });
  }

  ngOnInit(): void {}

  loadTrades() {
    if (!this.userId) return;
    this.tradeService.getUserTrades(this.userId).subscribe(data => {
      this.trades = data;
    });
  }

  get filteredTrades() {
    if (!this.userId) return [];
    return this.trades.filter(t => 
      this.activeTab === 'outgoing' ? t.proposerId === this.userId : t.receiverId === this.userId
    );
  }

  updateStatus(tradeId: number, status: string) {
    this.tradeService.updateTradeStatus(tradeId, status).subscribe(() => {
      this.loadTrades();
    });
  }
}
