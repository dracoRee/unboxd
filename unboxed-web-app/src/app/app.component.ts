import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface MarketItem {
  id: number;
  name: string;
  game: string;
  imageUrl: string;
  quantity: number;
  price: number;
  rarity?: string;
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'Community Market';
  
  activeTab = 'popular';
  searchQuery = '';
  selectedGame = 'all';
  showAdvancedOptions = false;
  
  tabs = [
    { id: 'history', label: 'My Market History' },
    { id: 'listings', label: 'My Active Listings' },
    { id: 'popular', label: 'Popular' },
    { id: 'recent', label: 'Recently Listed' }
  ];
  
  allItems: MarketItem[] = [
    {
      id: 1,
      name: 'AK-47 | Redline (Field-Tested)',
      game: 'Counter-Strike 2',
      imageUrl: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot7HxfDhjxszJemkV09-5lpKKqPrxN7LEmyVQ7MEpiLuSrYmnjQO3-UdsZGHyd4_Bd1RvNQ7T_FDrw-_ng5Pu75iY1zI97bhBMrNf/360fx360f',
      quantity: 1247,
      price: 24.99,
      rarity: 'Classified'
    },
    {
      id: 2,
      name: 'AWP | Asiimov (Field-Tested)',
      game: 'Counter-Strike 2',
      imageUrl: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot621FAR17PLfYQJD_9W7m5a0mvLwOq7c2D4D6sQj2r-Xo9-g3gHm-UBuMW_6JoOVcVQ2aVqE-wS_kO3u15G-6ZXLnXU2vCUi4XvfnhKy1UtFaOBxxavJVxzAUPISYNy_/360fx360f',
      quantity: 892,
      price: 89.50,
      rarity: 'Covert'
    },
    {
      id: 3,
      name: 'M4A4 | Howl (Factory New)',
      game: 'Counter-Strike 2',
      imageUrl: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpou-6kejhz2v_Nfz5H_uO1gb-Gw_alDLPIhm5D18d0i_rVyoD0mlOx5UZpNWHxJYfEJgE-aVrU_lC9w-i9hcC-vJXKnXVn7yIl4XvfnhGy1UtFaOBxxavJVxzAUPISYNy_/360fx360f',
      quantity: 34,
      price: 4250.00,
      rarity: 'Contraband'
    },
    {
      id: 4,
      name: 'Glock-18 | Fade (Factory New)',
      game: 'Counter-Strike 2',
      imageUrl: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgposbaqKAxf0Ob3djFN79eJkIGZnvnxDLfYkWNF18lwmO7Eu9-h2gzj-kVkYzqnJo-VdlI3ZwqGrwO9xOjxxcjrZtbCqA/360fx360f',
      quantity: 156,
      price: 425.00,
      rarity: 'Rare Special'
    },
    {
      id: 5,
      name: 'Arcana - Demon Eater',
      game: 'Dota 2',
      imageUrl: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXA5Q1NL4kmrAlOA0_FVPCi2t_fUkRxNztUoreaOQhf3_LadjgMvN2ykL-HnvD8J_WFkDMBuMYpiLqQ9Nqm2wHnrRJqYzv1JNfAJgQ-YQqG_lO9wOy5hJG-6ZrNn3Uw7Cgl4SuJnBPl1UpMPLVs0_vJUkGVRPsZUKfMbls/360fx360f',
      quantity: 423,
      price: 34.99,
      rarity: 'Arcana'
    },
    {
      id: 6,
      name: 'Desert Eagle | Blaze (Factory New)',
      game: 'Counter-Strike 2',
      imageUrl: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgposr-kLAtl7PLZTjlH_9mkgIWKkPvLPr7Vn35cppMl2L3Dpdqt2lDi-0duYW-gLYWVcgc3Zl2D-QO9xLvxxcjr0c_WGWI/360fx360f',
      quantity: 234,
      price: 145.00,
      rarity: 'Restricted'
    },
    {
      id: 7,
      name: 'Butterfly Knife | Fade (Factory New)',
      game: 'Counter-Strike 2',
      imageUrl: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpovbSsLQJf0ebcZThQ6tCvq4GGqPD1PrbQqWdQ-NZlteXI8oThxlWx-kE-Yzz7d4SQdQQ9MFrU-lC9w-i9hcC-vJXKnXVn7yIl4XvfnhGy1UtFaOBxxavJVxzAUPISYNy_/360fx360f',
      quantity: 67,
      price: 1850.00,
      rarity: 'Covert'
    },
    {
      id: 8,
      name: 'Immortal Treasure III 2023',
      game: 'Dota 2',
      imageUrl: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXA5Q1NL4kmrAlOA0_FVPCi2t_fUkRxNztUoreaOQhf3_LadjgMvN2ykL-HnvD8J_WFkDMBuMYpiLqQ9Nqm2wHnrRJqYzv1JNfAJgQ-YQqG_lO9wOy5hJG-6ZrNn3Uw7Cgl4SuJnBPl1UpMPLVs0_vJUkGVRPsZUKfMbls/360fx360f',
      quantity: 1523,
      price: 2.49,
      rarity: 'Immortal'
    },
    {
      id: 9,
      name: 'Karambit | Doppler (Factory New)',
      game: 'Counter-Strike 2',
      imageUrl: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpovbSsLQJf2PLacDBA5ciJlY20k_jkI7fUhFRB4MRij7nE8Nug2lCx-kE-Y2vwJoOVdAc7YVrW-1C5wOzxxcjrZtbCqA/360fx360f',
      quantity: 89,
      price: 950.00,
      rarity: 'Covert'
    },
    {
      id: 10,
      name: 'USP-S | Kill Confirmed (Minimal Wear)',
      game: 'Counter-Strike 2',
      imageUrl: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpoo6m1FBRp3_bGcjhQ09-jq5WYh8j_OrfdqWdQ-NZlteXI8oTht1i1uRQ5fTigI4-QdAE3aFnZ_VW7xOu5hJC-6ZXLnXU2vCUl4XvfnhGy1UtFaOBxxavJVxzAUPISYNy_/360fx360f',
      quantity: 567,
      price: 67.50,
      rarity: 'Classified'
    }
  ];
  
  get filteredItems(): MarketItem[] {
    return this.allItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                           item.game.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchesGame = this.selectedGame === 'all' || item.game === this.selectedGame;
      return matchesSearch && matchesGame;
    });
  }
  
  get games(): string[] {
    return ['all', ...Array.from(new Set(this.allItems.map(item => item.game)))];
  }
  
  setActiveTab(tabId: string): void {
    this.activeTab = tabId;
  }
  
  toggleAdvancedOptions(): void {
    this.showAdvancedOptions = !this.showAdvancedOptions;
  }
  
  formatPrice(price: number): string {
    return `$${price.toFixed(2)}`;
  }
}

