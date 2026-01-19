export interface SeriesProgress {
  seriesId: number;
  seriesName: string;
  totalItems: number;
  ownedItems: number;
  items: CollectibleItem[];
}

export interface CollectibleItem {
  id: number;
  name: string;
  rarity?: string;
  referenceValue?: number;
  imageUrl: string | null;
  quantity?: number;
  seriesId?: number;
  isOwned: boolean;
  serialNumber?: string;
  condition?: string;
  demoVideoUrl?: string;
  receiptUrl?: string;
}

export interface AIRecognitionResult {
  identification: {
    name: string;
    series: string;
    rarity: string;
    confidence: number;
  };
  dbMatch?: CollectibleItem;
}
