export interface TradeItem {
  item_id: string;
  name: string;
  series: string;
  rarity: string;
  referenceValue: number;
  imageUrl: string;
  isFeatured: boolean;
  ownerId?: string; // To distinguish between my items and others
  status?: 'available' | 'pending' | 'traded';
  description: string;
  condition: string;
  listedAt: Date;
  postedBy: {
    id: number;
    name: string;
    profilePicture?: string;
  };
}
