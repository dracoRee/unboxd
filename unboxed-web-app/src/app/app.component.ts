import { Component, OnInit } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from './components/navbar/navbar.component';
import { FooterComponent } from './footer/footer.component';
import { TradeModalComponent } from './components/trade-modal/trade-modal.component';
import { TradeItem } from './models/trade-item.model';
import { TradeService } from './services/trade.service';
import { AuthService } from './services/auth.service';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    CommonModule,
    NavbarComponent,
    FooterComponent,
    TradeModalComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'unboxed-web-app';
  
  selectedTradeItem: TradeItem | null = null;
  showNavAndFooter = true;

  // Auth pages where navbar and footer should be hidden
  private authPages = ['/login', '/register', '/forgot-password', '/reset-password'];

  constructor(
    private tradeService: TradeService,
    private router: Router,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    this.tradeService.proposeTrade$.subscribe(item => {
      this.openTradeModal(item);
    });

    // Check initial route
    this.checkRoute(this.router.url);

    // Listen to route changes
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.checkRoute(event.urlAfterRedirects);
    });
  }

  private checkRoute(url: string): void {
    // Hide navbar and footer on auth pages
    this.showNavAndFooter = !this.authPages.some(page => url.includes(page));
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


