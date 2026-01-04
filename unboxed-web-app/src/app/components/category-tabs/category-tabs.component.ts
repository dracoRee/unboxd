import { Component } from '@angular/core';

@Component({
  selector: 'app-category-tabs',
  imports: [],
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

  selectTab(tab: string) {
    this.activeTab = tab;
  }
}
