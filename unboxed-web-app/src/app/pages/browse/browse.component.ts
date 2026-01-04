import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CategoryTabsComponent } from '../../components/category-tabs/category-tabs.component';
import { SidebarFiltersComponent } from '../../components/sidebar-filters/sidebar-filters.component';
import { FeaturedTradeComponent } from '../../components/featured-trade/featured-trade.component';
import { TradeGridComponent } from '../../components/trade-grid/trade-grid.component';

@Component({
  selector: 'app-browse',
  standalone: true,
  imports: [
    CommonModule,
    CategoryTabsComponent,
    SidebarFiltersComponent,
    FeaturedTradeComponent,
    TradeGridComponent
  ],
  templateUrl: './browse.component.html',
})
export class BrowseComponent {}
