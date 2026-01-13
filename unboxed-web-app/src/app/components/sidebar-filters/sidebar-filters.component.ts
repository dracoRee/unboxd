import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TradeService } from '../../services/trade.service';

@Component({
  selector: 'app-sidebar-filters',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sidebar-filters.component.html',
  styleUrl: './sidebar-filters.component.css'
})
export class SidebarFiltersComponent implements OnInit {
  selectedSeries: string[] = [];
  selectedRarities: string[] = [];
  maxValue: number = 500;

  constructor(
    private tradeService: TradeService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    // 1. Subscribe to global filter changes (e.g. from Reset)
    this.tradeService.filters$.subscribe(filters => {
        // We need to map back 'Series Name Series' to 'Series Name' if possible, OR just rely on logic.
        // The service stores 'Ancient Castle Series' but checkbox uses 'Ancient Castle'.
        // This mapping logic is a bit fragile (adding/removing ' Series').
        // Let's assume for now we just clear if empty.
        if (filters.series === undefined || filters.series.length === 0) {
            this.selectedSeries = [];
        }
        if (filters.rarity === undefined || filters.rarity.length === 0) {
             this.selectedRarities = [];
        }
    });

    // 2. Handle URL query params
    this.route.queryParams.subscribe(params => {
      const series = params['series'];
      if (series) {
        if (!this.selectedSeries.includes(series)) {
            this.selectedSeries.push(series);
            // We do NOT call updateFilters here if we want to avoid loops with the subscription above?
            // Actually, querying params is an *input*. We *should* push to service.
            this.updateFilters();
        }
      }
    });
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
