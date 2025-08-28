import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper function to generate unique file names
export const generateFileName = (originalName: string, userId?: string): string => {
  const timestamp = Date.now()
  const randomId = Math.random().toString(36).substring(2, 15)
  const extension = originalName.split('.').pop()
  const baseName = originalName.split('.')[0].replace(/[^a-zA-Z0-9]/g, '_')
  
  return `${userId || 'anonymous'}_${baseName}_${timestamp}_${randomId}.${extension}`
}

// Helper function to get file size in MB
export const getFileSizeMB = (bytes: number): number => {
  return Math.round((bytes / (1024 * 1024)) * 100) / 100
}
