import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * Upload a file to Supabase Storage
 * @param bucket - Storage bucket name
 * @param path - File path within the bucket
 * @param file - File buffer to upload
 * @param contentType - MIME type of the file
 * @returns Public URL of the uploaded file
 */
export async function uploadFile(
  bucket: string,
  path: string,
  file: Buffer,
  contentType: string
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { 
      contentType,
      upsert: true // Overwrite if file exists
    });
    
  if (error) {
    console.error('Storage upload error:', error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }
  
  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);
    
  return publicUrl;
}

/**
 * Get a signed URL for accessing a private file
 * @param bucket - Storage bucket name
 * @param path - File path within the bucket
 * @param expiresIn - URL expiration time in seconds (default: 1 hour)
 * @returns Signed URL
 */
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn: number = 3600
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);
    
  if (error) {
    console.error('Signed URL error:', error);
    throw new Error(`Failed to get signed URL: ${error.message}`);
  }
  
  return data.signedUrl;
}

/**
 * Delete a file from Supabase Storage
 * @param bucket - Storage bucket name
 * @param path - File path within the bucket
 */
export async function deleteFile(
  bucket: string,
  path: string
): Promise<void> {
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path]);
    
  if (error) {
    console.error('Storage delete error:', error);
    throw new Error(`Failed to delete file: ${error.message}`);
  }
}

/**
 * Create storage buckets if they don't exist
 */
export async function ensureBucketsExist(): Promise<void> {
  const buckets = [
    { name: 'collectible-images', public: true },
    { name: 'collectible-demos', public: true },
    { name: 'collectible-receipts', public: false } // Private bucket
  ];

  for (const bucket of buckets) {
    const { data: existing } = await supabase.storage.getBucket(bucket.name);
    
    if (!existing) {
      const { error } = await supabase.storage.createBucket(bucket.name, {
        public: bucket.public,
        fileSizeLimit: bucket.name === 'collectible-demos' ? 52428800 : 10485760 // 50MB for videos, 10MB for others
      });
      
      if (error) {
        console.error(`Failed to create bucket ${bucket.name}:`, error);
      } else {
        // console.log(`✅ Created storage bucket: ${bucket.name}`);
      }
    }
  }
}
