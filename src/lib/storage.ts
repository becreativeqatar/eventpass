import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const bucketName = process.env.SUPABASE_BUCKET || 'accreditation-photos';

// Only initialize Supabase client if environment variables are set
const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

export interface UploadParams {
  path: string;
  bytes: Buffer;
  contentType: string;
}

export async function sbUpload({ path, bytes, contentType }: UploadParams) {
  if (!supabase) {
    throw new Error('Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }

  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(path, bytes, {
      contentType,
      upsert: true,
    });

  if (error) {
    console.error('Supabase upload error:', error);
    throw new Error(`Upload failed: ${error.message}`);
  }

  return data;
}

export async function sbPublicUrl(path: string) {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { data } = supabase.storage
    .from(bucketName)
    .getPublicUrl(path);

  return data.publicUrl;
}

export async function sbSignedUrl(path: string, expiresInSec: number = 3600) {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase.storage
    .from(bucketName)
    .createSignedUrl(path, expiresInSec);

  if (error) {
    console.error('Supabase signed URL error:', error);
    throw new Error(`Failed to create signed URL: ${error.message}`);
  }

  return data.signedUrl;
}

export async function sbRemove(path: string) {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase.storage
    .from(bucketName)
    .remove([path]);

  if (error) {
    console.error('Supabase remove error:', error);
    throw new Error(`Failed to remove file: ${error.message}`);
  }

  return data;
}

export async function sbList(prefix?: string) {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase.storage
    .from(bucketName)
    .list(prefix);

  if (error) {
    console.error('Supabase list error:', error);
    throw new Error(`Failed to list files: ${error.message}`);
  }

  return data;
}

export function isStorageConfigured(): boolean {
  return !!supabase;
}
