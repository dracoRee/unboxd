import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TradeService } from '../../services/trade.service';
import { SupabaseService } from '../../services/supabase.service';
import { Series } from '../../models/series.model';

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

  availableSeries: string[] = [];
  isLoadingSeries = true;

  constructor(
    private tradeService: TradeService,
    private route: ActivatedRoute,
    private supabaseService: SupabaseService
  ) {}

  async ngOnInit() {
    await this.loadSeriesList();
    
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
        // When coming from query params (e.g. Explore page), we set it as the primary filter
        this.selectedSeries = [series];
        this.updateFilters();
      }
    });
  }

  async loadSeriesList() {
    try {
      const series = await this.supabaseService.getSeries();
      this.availableSeries = series.map((s: Series) => s.name);
    } catch (error) {
      console.error('Error loading series for filters:', error);
    } finally {
      this.isLoadingSeries = false;
    }
  }

  toggleSeries(seriesName: string) {
    if (this.selectedSeries.includes(seriesName)) {
      this.selectedSeries = this.selectedSeries.filter(s => s !== seriesName);
    } else {
      this.selectedSeries.push(seriesName);
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
      series: this.selectedSeries,
      rarity: this.selectedRarities,
      maxValue: this.maxValue
    });
  }
}
