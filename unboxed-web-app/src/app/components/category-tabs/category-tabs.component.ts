import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { TradeService } from '../../services/trade.service';

@Component({
  selector: 'app-category-tabs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './category-tabs.component.html',
  styleUrl: './category-tabs.component.css'
})
export class CategoryTabsComponent implements OnInit {
  categories = [
    'All',
    'My Collection'
  ];
  
  activeTab = 'All';

  constructor(
    private tradeService: TradeService,
    private router: Router
  ) {
    // Listen to route changes to update active tab
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.setActiveTabFromUrl(event.url);
    });
  }

  ngOnInit() {
    this.setActiveTabFromUrl(this.router.url);
  }

  private setActiveTabFromUrl(url: string) {
    if (url.includes('my-collection')) {
      this.activeTab = 'My Collection';
    } else {
      this.activeTab = 'All';
    }
  }

  selectTab(tab: string) {
    this.activeTab = tab;
    
    if (tab === 'My Collection') {
      this.router.navigate(['/my-collection']);
    } else if (tab === 'All') {
      this.router.navigate(['/browse']);
      this.tradeService.updateFilters({ category: tab });
    } else {
      this.tradeService.updateFilters({ category: tab });
    }
  }
}
