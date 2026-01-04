import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TradeService } from '../../services/trade.service';
import { TradeItem } from '../../models/trade-item.model';
import { TradeCardComponent } from '../trade-card/trade-card.component';

@Component({
  selector: 'app-trade-grid',
  standalone: true,
  imports: [CommonModule, TradeCardComponent],
  templateUrl: './trade-grid.component.html',
  styleUrl: './trade-grid.component.css'
})
export class TradeGridComponent implements OnInit {
  items: TradeItem[] = [];

  constructor(private tradeService: TradeService) {}

  ngOnInit(): void {
    this.tradeService.getTradeItems().subscribe(items => {
      this.items = items;
    });
  }
}
