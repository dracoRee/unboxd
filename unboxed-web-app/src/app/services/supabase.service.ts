import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;

  // Supabase Storage bucket name for images (for future use)
  private readonly IMAGES_BUCKET = 'images';

  constructor() {
    // console.log('Initializing Supabase client with URL:', environment.supabaseUrl);
    
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }
    );
  }

  /**
   * Get the Supabase Auth instance
   */
  get auth() {
    return this.supabase.auth;
  }

  /**
   * Fetch all items from the Collectible table joined with Series
   */
  async getItems(): Promise<any[]> {
    // console.log('Fetching items from Supabase...');
    
    // Performance: join with Series to get series name
    const { data, error } = await this.supabase
      .from('Collectible')
      .select('*, Series(*)');

    if (error) {
      console.error('Error fetching items:', error);
      throw error;
    }
    
    // console.log('Fetched items with Series join:', data);
    return data || [];
  }

  /**
   * Fetch active listings from UserListing joined with Collectible, Series, and User
   */
  async getAvailableListings(): Promise<any[]> {
    console.log('Fetching available listings from Supabase...');
    const { data, error } = await this.supabase
      .from('UserListing')
      .select(`
        *,
        Collectible (
          *,
          Series (*)
        ),
        User (
          id,
          name,
          profilePicture
        )
      `)
      .eq('isAvailableForTrade', true);

    if (error) {
      console.error('Error fetching listings:', error);
      throw error;
    }
    
    console.log('Fetched listed items:', data);
    return data || [];
  }

  /**
   * Fetch all series
   */
  async getSeries(): Promise<any[]> {
    console.log('Fetching series from Supabase...');
    
    const { data, error } = await this.supabase
      .from('Series')
      .select('*');

    if (error) {
      console.error('Error fetching series:', error);
      throw error;
    }
    
    return data || [];
  }

  /**
   * Fetch items filtered by series ID or Name
   */
  async getItemsBySeries(seriesId: number): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('Collectible')
      .select('*, Series(*)')
      .eq('seriesId', seriesId);

    if (error) {
      console.error('Error fetching items by series:', error);
      throw error;
    }
    return data || [];
  }

  /**
   * Fetch items owned by a specific user
   * Note: UserCollectible relates to Series, not Collectible
   */
  async getUserCollection(userId: number): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('UserCollectible')
      .select('*, Series(*)')
      .eq('userId', userId);

    if (error) {
      console.error('Error fetching user collection:', error);
      throw error;
    }
    // Return UserCollectible objects with Series information
    return data || [];
  }

  /**
   * Fetch items in a user's wishlist
   */
  async getUserWishlist(userId: number): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('WishlistItem')
      .select('*, Collectible(*, Series(*))')
      .eq('userId', userId);

    if (error) {
      console.error('Error fetching user wishlist:', error);
      throw error;
    }
    return data || [];
  }

  /**
   * Get the full image URL.
   * For now, uses local assets. When ready to scale, switch useSupabaseStorage to true
   * and ensure images are uploaded to your Supabase Storage bucket.
   */
  getImageUrl(imagePath: string, useSupabaseStorage: boolean = false): string {
    if (!imagePath) {
      return '/images/placeholder.webp'; // Fallback placeholder
    }

    if (useSupabaseStorage) {
      // Supabase Storage URL format
      // Remove 'images/' prefix if present since bucket name is already 'images'
      const cleanPath = imagePath.replace(/^images\//, '');
      return `${environment.supabaseUrl}/storage/v1/object/public/${this.IMAGES_BUCKET}/${cleanPath}`;
    } else {
      // Local assets - images are in public/images/ folder
      // If path already starts with '/', return as-is; otherwise prepend '/'
      return imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
    }
  }

  /**
   * Upload a file to Supabase Storage
   */
  async uploadFile(path: string, file: File): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from(this.IMAGES_BUCKET)
      .upload(path, file, {
        upsert: true,
        contentType: file.type
      });

    if (error) {
      console.error('Error uploading file:', error);
      throw error;
    }

    return this.getImageUrl(data.path, true);
  }
}
