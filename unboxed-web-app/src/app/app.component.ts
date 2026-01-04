import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from './components/navbar/navbar.component';
import { TradeModalComponent } from './components/trade-modal/trade-modal.component';
import { TradeItem } from './models/trade-item.model';
import { TradeService } from './services/trade.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    CommonModule,
    NavbarComponent,
    TradeModalComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'unboxed-web-app';
  
  selectedTradeItem: TradeItem | null = null;

  constructor(private tradeService: TradeService) {}

  ngOnInit(): void {
    this.tradeService.proposeTrade$.subscribe(item => {
      this.openTradeModal(item);
    });
  }

  openTradeModal(item: TradeItem) {
    this.selectedTradeItem = item;
  }

  closeTradeModal() {
    this.selectedTradeItem = null;
  }

  handleTradeSent(offer: any) {
    console.log('Trade offer sent:', offer);
    // In a real app, you'd call a service here
    alert(`Trade offer for ${offer.target.name} sent successfully! Status: ${offer.valueStatus}`);
  }
}


