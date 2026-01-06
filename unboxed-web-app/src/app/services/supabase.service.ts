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
    console.log('Initializing Supabase client with URL:', environment.supabaseUrl);
    
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey,
      {
        auth: {
          persistSession: false, // Disable session persistence to avoid lock issues
          autoRefreshToken: false
        }
      }
    );
  }

  /**
   * Get the Supabase client instance
   */
  getClient(): SupabaseClient {
    return this.supabase;
  }

  /**
   * Fetch all items from the items table
   */
  async getItems(): Promise<any[]> {
    console.log('Fetching items from Supabase...');
    
    const { data, error } = await this.supabase
      .from('items')
      .select('*');

    if (error) {
      console.error('Error fetching items:', error);
      throw error;
    }
    
    console.log('Fetched items:', data);
    return data || [];
  }

  /**
   * Fetch items filtered by series
   */
  async getItemsBySeries(series: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('items')
      .select('*')
      .eq('series', series);

    if (error) {
      console.error('Error fetching items by series:', error);
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
}
