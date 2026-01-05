import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TradeService } from '../../services/trade.service';
import { MessagingService, ChatMessage } from '../../services/messaging.service';

@Component({
  selector: 'app-inbox',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container mx-auto px-4 py-8">
      <h1 class="text-3xl font-bold mb-8">Inbox</h1>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-[600px]">
        <!-- Conversations List -->
        <div class="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden h-full">
          <div class="p-4 border-b border-gray-100 bg-gray-50/50">
            <h3 class="font-bold text-gray-900">Trade Discussions</h3>
          </div>
          <div class="overflow-y-auto max-h-[500px]">
            @for (trade of trades; track trade.id) {
              <div (click)="selectTrade(trade)" 
                   [class.bg-indigo-50]="selectedTrade?.id === trade.id"
                   class="p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors">
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center font-bold text-indigo-600">
                    {{ (trade.proposerId === userId ? trade.receiver.name : trade.proposer.name)[0] }}
                  </div>
                  <div class="flex-1 overflow-hidden">
                    <div class="flex justify-between items-center mb-1">
                      <span class="font-bold text-sm">{{ trade.proposerId === userId ? trade.receiver.name : trade.proposer.name }}</span>
                      <span class="text-[10px] text-gray-400 capitalize">{{ trade.status }}</span>
                    </div>
                    <p class="text-xs text-gray-500 truncate">Trade for: {{ trade.targetItem.name }}</p>
                  </div>
                </div>
              </div>
            } @empty {
              <div class="p-8 text-center text-gray-500 text-sm">No active discussions</div>
            }
          </div>
        </div>

        <!-- Chat View -->
        <div class="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full">
          @if (selectedTrade) {
            <div class="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 class="font-bold">Chat with {{ selectedTrade.proposerId === userId ? selectedTrade.receiver.name : selectedTrade.proposer.name }}</h3>
              <span class="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full font-bold">Trade #{{ selectedTrade.id }}</span>
            </div>
            
            <div class="flex-1 overflow-y-auto p-4 space-y-4 min-h-[400px]">
              @for (msg of messages; track msg.id) {
                <div [class.justify-end]="msg.senderId === userId" class="flex w-full">
                  <div [class.bg-indigo-600]="msg.senderId === userId"
                       [class.text-white]="msg.senderId === userId"
                       [class.bg-gray-100]="msg.senderId !== userId"
                       class="max-w-[70%] p-3 rounded-2xl text-sm">
                    {{ msg.content }}
                  </div>
                </div>
              }
            </div>

            <div class="p-4 border-t border-gray-100 flex gap-2">
              <input type="text" [(ngModel)]="newMessage" (keyup.enter)="sendMessage()" 
                     placeholder="Type a message..."
                     class="flex-1 bg-gray-50 border-transparent rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 ">
              <button (click)="sendMessage()" class="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          } @else {
            <div class="flex-1 flex flex-col items-center justify-center text-center p-12">
              <img src="https://api.dicebear.com/7.x/bottts/svg?seed=chat" class="w-32 h-32 mb-6 opacity-20">
              <h2 class="text-xl font-bold text-gray-400">Select a conversation</h2>
              <p class="text-gray-400 max-w-xs">Pick a trade from the list to start discussing the details.</p>
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class InboxComponent implements OnInit {
  trades: any[] = [];
  selectedTrade: any = null;
  messages: ChatMessage[] = [];
  newMessage: string = '';
  userId = 1;

  constructor(
    private tradeService: TradeService,
    private messagingService: MessagingService
  ) {}

  ngOnInit(): void {
    this.tradeService.getUserTrades(this.userId).subscribe(data => {
      this.trades = data;
    });
  }

  selectTrade(trade: any) {
    this.selectedTrade = trade;
    this.loadMessages();
  }

  loadMessages() {
    if (!this.selectedTrade) return;
    this.messagingService.getMessages(this.selectedTrade.id).subscribe(data => {
      this.messages = data;
    });
  }

  sendMessage() {
    if (!this.newMessage.trim() || !this.selectedTrade) return;
    this.messagingService.sendMessage(this.selectedTrade.id, this.userId, this.newMessage).subscribe(() => {
      this.newMessage = '';
      this.loadMessages();
    });
  }
}
