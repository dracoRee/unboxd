import { Component, OnInit, OnDestroy, effect, ViewChild, ElementRef } from '@angular/core';

import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { TradeService, SwapSuggestion } from '../../services/trade.service';
import { AuthService } from '../../services/auth.service';
import { UserService, UserListing } from '../../services/user.service';
import { CollectionService } from '../../services/collection.service';
import { MessagingService } from '../../services/messaging.service';
import { Subscription, Subject, debounceTime } from 'rxjs';

export interface VerificationChecklist {
  reviewsChecked: boolean;
  meetupArranged: boolean;
  itemInspected: boolean;
  proofRequested: boolean;
  authenticityVerified: boolean;
}

export type VerificationStatus = 'not_started' | 'in_progress' | 'verified';

export interface Trade {
  id: number;
  proposerId: number;
  receiverId: number;
  status: string;
  version: number;
  targetItem: {
    name: string;
    imageUrl: string;
  };
  offeredItems: any[];
  // Cash payment fields
  cashAmount: number;
  buyerPaysCash: boolean;
  // User-Led Verification Fields
  verificationStatus: VerificationStatus;
  verificationChecklist: VerificationChecklist;
  // Dual-party completion confirmation
  proposerConfirmedAt: string | null;
  receiverConfirmedAt: string | null;
  counterparty: {
    id: number;
    username: string;
    profilePicture: string | null;
    rating: number;
    completedTrades: number;
    memberSince: string;
    isPhoneVerified: boolean;
  };
  showVerification?: boolean;
}

interface TradeItemView {
  name: string;
  imageUrl: string;
  label: string;
  seriesName?: string | null;
  condition?: string | null;
  referenceValue?: number | null;
  description?: string | null;
}

@Component({
  selector: 'app-trades',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './trades.component.html',
  styleUrl: './trades.component.css'
})

export class TradesComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  
  atSymbol = "@";
  trades: Trade[] = [];
  swapSuggestions: SwapSuggestion[] = [];
  isLoadingSuggestions = false;
  myListings: UserListing[] = [];
  activeTab: 'outgoing' | 'incoming' | 'listings' | 'suggested' = 'listings';
  userId?: number;
  activeChatTradeId: number | null = null;
  isScanning = false;
  isUploaded = false; 
  isItemModalOpen = false;
  selectedItem: TradeItemView | null = null;
  isTradeConfirmModalOpen = false;
  tradeToConfirm: Trade | null = null;
  confirmAction: 'ACCEPTED' | 'DECLINED' | null = null;
  private readonly verificationStorageKey = 'tradeVerificationOpenById';
  private verificationOpenByTradeId = new Map<number, boolean>();
  private realtimeBound = false;
  private readonly subscriptions = new Subscription();
  private checklistPersist$ = new Subject<Trade>();
  private checklistSub?: Subscription;
  
  checklistItems: Array<{ key: keyof VerificationChecklist, label: string, helper: string }> = [
    { 
      key: 'reviewsChecked', 
      label: 'Checked seller reviews and past trades', 
      helper: 'Look for consistent positive feedback and successful P2P completions.' 
    },
    { 
      key: 'meetupArranged', 
      label: 'Arranged in-person meetup', 
      helper: 'Recommended for high-value items. Meet in public malls or cafes.' 
    },
    { 
      key: 'itemInspected', 
      label: 'Inspected item physically', 
      helper: 'Check for scratches, box condition, and holographic stickers.' 
    },
    { 
      key: 'proofRequested', 
      label: 'Requested demo video / photos', 
      helper: 'Ask for specific angles or a video with a piece of paper with their name.' 
    },
    { 
      key: 'authenticityVerified', 
      label: 'Verified authenticity proof', 
      helper: 'Check receipt, POP MART identity card, or serial number on the foot.' 
    }
  ];

  constructor(
    private tradeService: TradeService,
    private authService: AuthService,
    private userService: UserService,
    private collectionService: CollectionService,
    private messagingService: MessagingService,
    private router: Router
  ) {
    this.loadVerificationState();
    effect(() => {
      this.userId = this.authService.backendUser()?.id;
      if (this.userId) {
        this.loadTrades();
        this.loadListings();
        this.loadSwapSuggestions();
        this.bindRealtime(this.userId);
      }
    });
  }

  ngOnInit(): void {
    this.checklistSub = this.checklistPersist$.pipe(
      debounceTime(400)
    ).subscribe(trade => {
      this.persistChecklist(trade);
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.checklistSub?.unsubscribe();
  }

  private bindRealtime(userId: number) {
    if (this.realtimeBound) return;
    this.realtimeBound = true;

    this.messagingService.joinUserRoom(userId);

    this.subscriptions.add(
      this.messagingService.onTradeCreated().subscribe(() => {
        this.loadTrades();
        this.loadSwapSuggestions();
      })
    );

    this.subscriptions.add(
      this.messagingService.onTradeStatus().subscribe(payload => {
        this.applyTradeStatusUpdate(payload.tradeId, payload.status, payload.version);
      })
    );

    this.subscriptions.add(
      this.messagingService.onTradeChecklist().subscribe(payload => {
        this.applyTradeChecklistUpdate(
          payload.tradeId,
          payload.verificationChecklist,
          payload.verificationStatus,
          payload.version
        );
      })
    );

    this.subscriptions.add(
      this.messagingService.onTradeConfirmation().subscribe(payload => {
        this.applyTradeConfirmationUpdate(
          payload.tradeId,
          payload.proposerConfirmedAt,
          payload.receiverConfirmedAt,
          payload.status,
          payload.version
        );
      })
    );
  }

  private applyTradeStatusUpdate(tradeId: number, status: string, version: number) {
    const index = this.trades.findIndex(trade => trade.id === tradeId);
    if (index === -1) {
      this.loadTrades();
      return;
    }
    const trade = this.trades[index];
    this.trades[index] = {
      ...trade,
      status,
      version
    };
  }

  private applyTradeChecklistUpdate(tradeId: number, checklist: Record<string, boolean>, status: string, version: number) {
    const index = this.trades.findIndex(trade => trade.id === tradeId);
    if (index === -1) {
      this.loadTrades();
      return;
    }
    const trade = this.trades[index];
    this.trades[index] = {
      ...trade,
      verificationChecklist: { ...trade.verificationChecklist, ...checklist } as VerificationChecklist,
      verificationStatus: status as VerificationStatus,
      version
    };
  }

  private applyTradeConfirmationUpdate(
    tradeId: number,
    proposerConfirmedAt: string | null,
    receiverConfirmedAt: string | null,
    status: string,
    version: number
  ) {
    const index = this.trades.findIndex(trade => trade.id === tradeId);
    if (index === -1) {
      this.loadTrades();
      return;
    }
    const trade = this.trades[index];
    this.trades[index] = {
      ...trade,
      proposerConfirmedAt,
      receiverConfirmedAt,
      status,
      version
    };
  }

  private loadVerificationState() {
    try {
      const raw = localStorage.getItem(this.verificationStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, boolean>;
      Object.entries(parsed).forEach(([id, isOpen]) => {
        const tradeId = Number(id);
        if (!Number.isNaN(tradeId)) {
          this.verificationOpenByTradeId.set(tradeId, Boolean(isOpen));
        }
      });
    } catch (error) {
      console.warn('Failed to load verification state', error);
    }
  }

  private saveVerificationState() {
    const data: Record<string, boolean> = {};
    this.verificationOpenByTradeId.forEach((isOpen, id) => {
      data[id.toString()] = isOpen;
    });
    try {
      localStorage.setItem(this.verificationStorageKey, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to persist verification state', error);
    }
  }

  loadTrades() {
    if (!this.userId) return;
    this.tradeService.getUserTrades(this.userId).subscribe(data => {
      this.trades = data.map(trade => this.enrichTradeData(trade));
    });
  }

  loadListings() {
    if (!this.userId) return;
    this.userService.getUserListings(this.userId).subscribe(listings => {
      this.myListings = listings;
    });
  }

  loadSwapSuggestions() {
    if (!this.userId) return;
    this.isLoadingSuggestions = true;
    this.tradeService.getSwapSuggestions(this.userId).subscribe({
      next: suggestions => {
        this.swapSuggestions = suggestions;
      },
      error: () => {
        this.swapSuggestions = [];
        this.isLoadingSuggestions = false;
      },
      complete: () => {
        this.isLoadingSuggestions = false;
      }
    });
  }

  enrichTradeData(trade: any): Trade {
    const isOpen = this.verificationOpenByTradeId.get(trade.id) ?? false;
    const rawUsername = trade?.counterparty?.username ?? trade?.counterparty?.name ?? '';
    const normalizedUsername = typeof rawUsername === 'string' ? rawUsername.trim() : '';
    const resolvedUsername = normalizedUsername || `User_${trade?.counterparty?.id ?? 'Unknown'}`;
    const normalizedVerificationStatus = typeof trade?.verificationStatus === 'string'
      ? trade.verificationStatus.toLowerCase()
      : 'not_started';
    return {
      ...trade,
      version: Number.isInteger(trade.version) ? trade.version : 0,
      verificationStatus: normalizedVerificationStatus as VerificationStatus,
      verificationChecklist: trade.verificationChecklist || {
        reviewsChecked: false,
        meetupArranged: false,
        itemInspected: false,
        proofRequested: false,
        authenticityVerified: false
      },
      proposerConfirmedAt: trade.proposerConfirmedAt ?? null,
      receiverConfirmedAt: trade.receiverConfirmedAt ?? null,
      showVerification: isOpen,
      counterparty: trade.counterparty ? {
        id: trade.counterparty.id,
        username: resolvedUsername,
        rating: trade.counterparty.rating || 0,
        completedTrades: trade.counterparty.completedTrades || 0,
        memberSince: trade.counterparty.memberSince || 'Unknown',
        isPhoneVerified: trade.counterparty.isPhoneVerified || false
      } : {
        id: 0,
        username: 'Unknown User',
        rating: 0,
        completedTrades: 0,
        memberSince: 'Unknown',
        isPhoneVerified: false
      }
    };
  }

  get filteredTrades() {
    if (!this.userId) return [];
    return this.trades.filter(t => 
      this.activeTab === 'outgoing' ? t.proposerId === this.userId : t.receiverId === this.userId
    );
    
  }

  updateStatus(trade: Trade, status: string) {
    this.tradeService.updateTradeStatusWithGuard(
      trade.id,
      status,
      trade.status,
      trade.version
    ).subscribe({
      next: (updated) => {
        if (updated?.status) {
          this.applyTradeStatusUpdate(trade.id, updated.status, updated.version ?? trade.version + 1);
        } else {
          this.loadTrades();
        }
      },
      error: () => {
        this.loadTrades();
      }
    });
  }

  hasUserConfirmed(trade: Trade): boolean {
    if (this.userId === trade.proposerId) return !!trade.proposerConfirmedAt;
    if (this.userId === trade.receiverId) return !!trade.receiverConfirmedAt;
    return false;
  }

  hasCounterpartyConfirmed(trade: Trade): boolean {
    if (this.userId === trade.proposerId) return !!trade.receiverConfirmedAt;
    if (this.userId === trade.receiverId) return !!trade.proposerConfirmedAt;
    return false;
  }

  confirmCompletion(trade: Trade) {
    this.tradeService.confirmTradeCompletion(trade.id, trade.version, this.userId).subscribe({
      next: (updated) => {
        this.applyTradeConfirmationUpdate(
          trade.id,
          updated?.proposerConfirmedAt ?? trade.proposerConfirmedAt,
          updated?.receiverConfirmedAt ?? trade.receiverConfirmedAt,
          updated?.status ?? trade.status,
          updated?.version ?? trade.version + 1
        );
      },
      error: () => {
        this.loadTrades();
      }
    });
  }

  openItemModal(item: TradeItemView) {
    this.selectedItem = item;
    this.isItemModalOpen = true;
  }

  closeItemModal() {
    this.isItemModalOpen = false;
    this.selectedItem = null;
  }

  toggleVerification(trade: Trade) {
    trade.showVerification = !trade.showVerification;
    this.verificationOpenByTradeId.set(trade.id, Boolean(trade.showVerification));
    this.saveVerificationState();
  }

  

  getProgressCount(trade: Trade): number {
    return Object.values(trade.verificationChecklist).filter(Boolean).length;
  }

  getProgressPercentage(trade: Trade): number {
    return (this.getProgressCount(trade) / 5) * 100;
  }

  markAsVerified(trade: Trade) {
    if (this.getProgressCount(trade) >= 3) {
      trade.verificationStatus = 'verified';
      this.persistChecklist(trade);
    }
  }

  toggleCheck(trade: Trade, key: keyof VerificationChecklist) {
    const latestTrade = this.trades.find(t => t.id === trade.id);
    if (!latestTrade) return;

    latestTrade.verificationChecklist[key] = !latestTrade.verificationChecklist[key];

    const count = this.getProgressCount(latestTrade);
    latestTrade.verificationStatus = count === 0 ? 'not_started'
      : count >= 5 ? 'verified'
      : 'in_progress';

    this.checklistPersist$.next(latestTrade);  // debounced — won't fire until clicks stop
    if (count > 0 && count < 5) {
      latestTrade.verificationStatus = 'in_progress';
    } else if (count === 0) {
      latestTrade.verificationStatus = 'not_started';
    } else {
      latestTrade.verificationStatus = 'verified';
    }

    this.persistChecklist(latestTrade);
  }

  private persistChecklist(trade: Trade) {
    this.tradeService.updateTradeChecklist(
      trade.id,
      trade.verificationChecklist as unknown as Record<string, boolean>,
      trade.verificationStatus,
      trade.version
    ).subscribe({
      next: (updated) => {
        // Write version back in-place — don't spread a new object
        const index = this.trades.findIndex(t => t.id === trade.id);
        if (index !== -1 && updated?.version !== undefined) {
          this.trades[index].version = updated.version;
          this.trades[index].verificationChecklist = updated.verificationChecklist ?? this.trades[index].verificationChecklist;
          this.trades[index].verificationStatus = updated.verificationStatus ?? this.trades[index].verificationStatus;
        } else {
          this.loadTrades();
        }
      },
      error: () => {
        this.loadTrades();
      }
    });
  }

  getStatusClass(trade: Trade) {
    const status = trade.status.toUpperCase();
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-700';
      case 'ACCEPTED': return 'bg-green-100 text-green-700';
      case 'IN_TRANSIT': return 'bg-blue-100 text-blue-700';
      case 'DECLINED': return 'bg-red-100 text-red-700';
      case 'COMPLETED': return 'bg-indigo-100 text-indigo-700';
      case 'CANCELLED': return 'bg-gray-100 text-gray-700';
      case 'EXPIRED': return 'bg-gray-200 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  }

  triggerUpload() {
    this.fileInput.nativeElement.click();
    // console.log("button clicked")
  }

  editListing(listingId: number) {
    this.router.navigate(['/trades/edit-item', listingId]);
  }

  onFileSelected(event: any) {
  const file = event.target.files[0];
  
  if (!file) {
    // console.log("No file selected");
    return;
  }

  // Check both Supabase and backend user
  const supabaseUser = this.authService.currentUser();
  const currentBackendUser = this.authService.backendUser();
  
  // console.log("Supabase User:", supabaseUser);
  // console.log("Backend User:", currentBackendUser);
  
  // If not logged into Supabase at all
  if (!supabaseUser) {
    // console.log("Not logged into Supabase");
    alert('You must be logged in to list an item. Please log in first.');
    // Reset the file input
    this.fileInput.nativeElement.value = '';
    return;
  }
  
  // If logged into Supabase but backend sync hasn't completed
  if (!currentBackendUser || !currentBackendUser.id) {
    // console.log("Backend user not synced yet. Please wait and try again.");
    alert('Your account is still syncing. Please wait a moment and try again.');
    // Reset the file input
    this.fileInput.nativeElement.value = '';
    return;
  }

  const userId = currentBackendUser.id;
  // console.log("Using userId:", userId);

  // Convert file to base64 and store in session storage
  const reader = new FileReader();
  reader.onload = (e: any) => {
    const imageDataUrl = e.target.result;
    sessionStorage.setItem('uploadedItemImage', imageDataUrl);
    
    // Navigate to upload-item page
    this.router.navigate(['/trades/upload-item']);
  };
  reader.readAsDataURL(file);
  
  // Reset input to allow selecting the same file again if needed
  this.fileInput.nativeElement.value = '';
}

openChat(counterpartyId: number): void {
  const currentUserId = this.authService.backendUser()?.id;
  
  if (!currentUserId) {
    alert('Please log in to chat');
    return;
  }

  if (currentUserId === counterpartyId) {
    alert('You cannot chat with yourself');
    return;
  }

  this.messagingService.createConversation([currentUserId, counterpartyId]).subscribe({
    next: (conv) => {
      this.router.navigate(['/chat'], { queryParams: { convId: conv.id } });
    },
    error: (err) => {
      console.error('Failed to initiate chat', err);
      alert('Could not start conversation. Please try again.');
    }
  });
}

  isCurrentUser(userId: number) {
    return this.userId === userId;
  }

openTradeConfirmModal(trade: Trade, action: 'ACCEPTED' | 'DECLINED') {
  this.tradeToConfirm = trade;
  this.confirmAction = action;
  this.isTradeConfirmModalOpen = true;
}

closeTradeConfirmModal() {
  this.isTradeConfirmModalOpen = false;
  this.tradeToConfirm = null;
  this.confirmAction = null;
}

confirmTradeAction() {
  if (this.tradeToConfirm && this.confirmAction) {
    this.updateStatus(this.tradeToConfirm, this.confirmAction);
    this.closeTradeConfirmModal();
  }
}
}
