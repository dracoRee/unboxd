export interface TradeItem {
  item_id: string; // UserListing.id
  collectible_id?: string; // Collectible.id
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
  postedBy: {
    id: number;
    name: string;
    profilePicture?: string;
  };
}
