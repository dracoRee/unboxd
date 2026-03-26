export interface TradeItem {
  item_id: number; // UserListing.id
  collectible_id?: number; // Collectible.id
  listingTitle?: string;
  name: string;
  series: string;
  rarity: string;
  referenceValue: number;
  listingPrice: number;
  imageUrl: string;
  isFeatured: boolean;
  ownerId?: string; 
  ownerName?: string;
  ownerAvatar?: string;
  status?: 'available' | 'pending' | 'traded';
  description: string;
  condition: string;
  listedAt: Date;
  isFavourited?: boolean;
  vouchCount?: number;
  hasVouched?: boolean;
  postedBy: {
    id: number;
    name: string;
    username?: string;
    profilePicture?: string;
  };
}
