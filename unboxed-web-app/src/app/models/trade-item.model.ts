export interface TradeItem {
  id: string;
  name: string;
  series: string;
  rarity: string;
  referenceValue: number;
  imageUrl: string;
  isFeatured: boolean;
  ownerId?: string; // To distinguish between my items and others
  status?: 'available' | 'pending' | 'traded';
}
