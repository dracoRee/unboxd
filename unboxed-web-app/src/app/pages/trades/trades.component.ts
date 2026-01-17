import { Component, OnInit, effect, ViewChild, ElementRef } from '@angular/core';

import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TradeService } from '../../services/trade.service';
import { AuthService } from '../../services/auth.service';
import { UserService, UserListing } from '../../services/user.service';
import { CollectionService } from '../../services/collection.service';
import { ChatComponent } from '../../components/chat/chat.component';

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
  targetItem: {
    name: string;
    imageUrl: string;
  };
  offeredItems: any[];
  // User-Led Verification Fields
  verificationStatus: VerificationStatus;
  verificationChecklist: VerificationChecklist;
  counterparty?: {
    username: string;
    rating: number;
    completedTrades: number;
    memberSince: string;
    isPhoneVerified: boolean;
  };
  showVerification?: boolean;
}

@Component({
  selector: 'app-trades',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './trades.component.html',
  styleUrl: './trades.component.css'
})

export class TradesComponent implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  
  trades: Trade[] = [];
  myListings: UserListing[] = [];
  activeTab: 'outgoing' | 'incoming' | 'listings' = 'outgoing';
  userId?: number;
  activeChatTradeId: number | null = null;
  isScanning = false;
  isUploaded = false; 
  
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
    private router: Router
  ) {
    effect(() => {
      this.userId = this.authService.backendUser()?.id;
      if (this.userId) {
        this.loadTrades();
        this.loadListings();
      }
    });
  }

  ngOnInit(): void {}

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

  enrichTradeData(trade: any): Trade {
    return {
      ...trade,
      verificationStatus: trade.verificationStatus || 'not_started',
      verificationChecklist: trade.verificationChecklist || {
        reviewsChecked: false,
        meetupArranged: false,
        itemInspected: false,
        proofRequested: false,
        authenticityVerified: false
      },
      showVerification: false,
      counterparty: {
        username: trade.counterparty?.username || ('Collector_' + Math.floor(Math.random() * 1000)),
        rating: trade.counterparty?.rating || (4 + Math.random()).toFixed(1),
        completedTrades: trade.counterparty?.completedTrades || Math.floor(Math.random() * 50),
        memberSince: trade.counterparty?.memberSince || '2023',
        isPhoneVerified: trade.counterparty?.isPhoneVerified ?? true
      }
    };
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

  toggleCheck(trade: Trade, key: keyof VerificationChecklist) {
    trade.verificationChecklist[key] = !trade.verificationChecklist[key];
    const count = this.getProgressCount(trade);
    if (count > 0 && count < 5) {
      trade.verificationStatus = 'in_progress';
    } else if (count === 0) {
      trade.verificationStatus = 'not_started';
    }
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
    }
  }

  getStatusClass(trade: Trade) {
    const status = trade.status.toUpperCase();
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-700';
      case 'ACCEPTED': return 'bg-green-100 text-green-700';
      case 'DECLINED': return 'bg-red-100 text-red-700';
      case 'COMPLETED': return 'bg-indigo-100 text-indigo-700';
      case 'CANCELLED': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  }

  triggerUpload() {
    this.fileInput.nativeElement.click();
    console.log("button clicked")

  }

onFileSelected(event: any) {
  const file = event.target.files[0];
  
  if (!file) {
    console.log("No file selected");
    return;
  }

  // Check both Supabase and backend user
  const supabaseUser = this.authService.currentUser();
  const currentBackendUser = this.authService.backendUser();
  
  console.log("Supabase User:", supabaseUser);
  console.log("Backend User:", currentBackendUser);
  
  // If not logged into Supabase at all
  if (!supabaseUser) {
    console.log("Not logged into Supabase");
    alert('You must be logged in to list an item. Please log in first.');
    // Reset the file input
    this.fileInput.nativeElement.value = '';
    return;
  }
  
  // If logged into Supabase but backend sync hasn't completed
  if (!currentBackendUser || !currentBackendUser.id) {
    console.log("Backend user not synced yet. Please wait and try again.");
    alert('Your account is still syncing. Please wait a moment and try again.');
    // Reset the file input
    this.fileInput.nativeElement.value = '';
    return;
  }

  const userId = currentBackendUser.id;
  console.log("Using userId:", userId);

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
}
