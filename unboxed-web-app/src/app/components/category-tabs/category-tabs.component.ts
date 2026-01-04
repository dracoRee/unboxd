import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TradeService } from '../../services/trade.service';

@Component({
  selector: 'app-category-tabs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './category-tabs.component.html',
  styleUrl: './category-tabs.component.css'
})
export class CategoryTabsComponent {
  categories = [
    'All',
    'Series',
    'Characters',
    'Limited Editions',
    'Popular Trades',
    'My Collection'
  ];
  
  activeTab = 'All';

  constructor(private tradeService: TradeService) {}

  selectTab(tab: string) {
    this.activeTab = tab;
    this.tradeService.updateFilters({ category: tab });
  }
}
