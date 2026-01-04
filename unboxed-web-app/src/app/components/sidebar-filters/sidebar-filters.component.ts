import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TradeService } from '../../services/trade.service';

@Component({
  selector: 'app-sidebar-filters',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sidebar-filters.component.html',
  styleUrl: './sidebar-filters.component.css'
})
export class SidebarFiltersComponent {
  selectedSeries: string[] = [];
  selectedRarities: string[] = [];
  maxValue: number = 500;

  constructor(private tradeService: TradeService) {}

  onSeriesChange(seriesName: string, event: any) {
    if (event.target.checked) {
      this.selectedSeries.push(seriesName);
    } else {
      this.selectedSeries = this.selectedSeries.filter(s => s !== seriesName);
    }
    this.updateFilters();
  }

  toggleRarity(rarity: string) {
    if (this.selectedRarities.includes(rarity)) {
      this.selectedRarities = this.selectedRarities.filter(r => r !== rarity);
    } else {
      this.selectedRarities.push(rarity);
    }
    this.updateFilters();
  }

  onValueChange() {
    this.updateFilters();
  }

  private updateFilters() {
    this.tradeService.updateFilters({
      series: this.selectedSeries.length ? this.selectedSeries.map(s => s + ' Series') : [],
      rarity: this.selectedRarities,
      maxValue: this.maxValue
    });
  }
}
