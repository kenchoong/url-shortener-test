export interface ShortUrlRecord {
  url: string;
  createdAt: string;
  visits: number;
}

export interface StorageFileShape {
  urls: Record<string, ShortUrlRecord>;
}
