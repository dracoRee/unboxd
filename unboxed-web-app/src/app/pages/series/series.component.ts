import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
import { Series } from '../../models/series.model';

@Component({
  selector: 'app-series',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './series.component.html',
})
export class SeriesComponent implements OnInit {
  seriesList: Series[] = [];
  isLoading = true;

  constructor(
    private supabaseService: SupabaseService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadSeries();
  }

  async loadSeries() {
    try {
      this.seriesList = await this.supabaseService.getSeries();
    } catch (error) {
      console.error('Error loading series:', error);
    } finally {
      this.isLoading = false;
    }
  }

  selectSeries(seriesName: string) {
    this.router.navigate(['/browse'], { 
      queryParams: { series: seriesName } 
    });
  }
}
