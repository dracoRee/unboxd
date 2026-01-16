export interface TradeItem {
  item_id: string; // UserListing.id
  collectible_id?: string; // Collectible.id
  name: string;
  series: string;
  rarity: string;
  referenceValue: number;
  imageUrl: string;
  isFeatured: boolean;
  ownerId?: string; 
  ownerName?: string;
  ownerAvatar?: string;
  status?: 'available' | 'pending' | 'traded';
}
