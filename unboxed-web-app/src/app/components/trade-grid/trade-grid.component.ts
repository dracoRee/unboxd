import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TradeService } from '../../services/trade.service';
import { TradeItem } from '../../models/trade-item.model';
import { TradeCardComponent } from '../trade-card/trade-card.component';
import { AdvertisementCardComponent } from '../advertisement-card/advertisement-card.component';
import { AdvertisementData } from '../advertisement-card/advertisement-card.component';

@Component({
  selector: 'app-trade-grid',
  standalone: true,
  imports: [CommonModule, TradeCardComponent, AdvertisementCardComponent],
  templateUrl: './trade-grid.component.html',
  styleUrl: './trade-grid.component.css'
})
export class TradeGridComponent implements OnInit {
  items: TradeItem[] = [];
  gridItems: (TradeItem | { type: 'ad'; data: AdvertisementData })[] = [];

  sanRemoAd: AdvertisementData = {
    name: 'San Remo Platinum Series - Jet Black',
    brand: 'Joshua Legal Art Gallery',
    description: 'Professional Trolley Bag - Jet Black',
    url: 'https://www.joshualegalartgallery.com/products/san-remo-platinum-jet-black',
    imageDir: 'ads/joshua-legal-art-gallery_san-remo',
    imageNames: ['sanremo_ad_1.webp', 'sanremo_ad_2.webp', 'sanremo_ad_3.webp', 'sanremo_ad_4.webp']
  };

  comfyAd: AdvertisementData = {
    name: 'Comfy Studio - Cozy Urban Escape',
    brand: 'Comfy Asia',
    description: 'Modern Airbnb Studio in the Heart of the City',
    url: 'https://www.airbnb.co.in/rooms/1357131563921468625',
    imageDir: 'ads/comfy-asia_comfy-studio',
    imageNames: ['comfy-asia_comfy-studio-1.avif', 'comfy-asia_comfy-studio-2.avif', 'comfy-asia_comfy-studio-3.avif', 'comfy-asia_comfy-studio-4.avif']
  };

  constructor(private tradeService: TradeService) {}

  ngOnInit(): void {
    this.tradeService.getTradeItems().subscribe(items => {
      this.items = items;
      this.buildGridWithAds();
    });
  }

  buildGridWithAds(): void {
    this.gridItems = [];
    let itemIndex = 0;
    let adToggle = true; // true for sanRemo, false for comfy

    // Add first 2 trade cards
    for (let i = 0; i < 2 && itemIndex < this.items.length; i++) {
      this.gridItems.push(this.items[itemIndex++]);
    }

    // Add ads in alternating pattern
    while (itemIndex < this.items.length) {
      // Add ad
      this.gridItems.push({
        type: 'ad',
        data: adToggle ? this.sanRemoAd : this.comfyAd
      });
      adToggle = !adToggle;

      // Add 3 trade cards after ad
      for (let i = 0; i < 3 && itemIndex < this.items.length; i++) {
        this.gridItems.push(this.items[itemIndex++]);
      }
    }
  }

  isAd(item: any): boolean {
    return item.type === 'ad';
  }

  isTradeItem(item: any): boolean {
    return item.type !== 'ad';
  }
}
