import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isOwner } from '@/lib/owner'
import { getFileType } from '@/lib/actions/media-assets'

const STORAGE_BUCKET = 'media-library'
const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB

// Allowed MIME types
const ALLOWED_TYPES = new Set([
  // Images
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/avif',
  // Videos
  'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
  // Audio
  'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/aac',
  // Documents
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  // Animations (Lottie)
  'application/json',
])

function generateUniqueFilename(originalFilename: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const ext = originalFilename.split('.').pop() || ''
  const baseName = originalFilename.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9-_]/g, '_')
  return `${baseName}-${timestamp}-${random}.${ext}`
}

// POST - Upload a new media file
export async function POST(request: NextRequest) {
  try {
    const owner = await isOwner()
    if (!owner) {
      return NextResponse.json({ error: 'Owner access required' }, { status: 403 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const name = formData.get('name') as string | null
    const description = formData.get('description') as string | null
    const altText = formData.get('alt_text') as string | null
    const categoryId = formData.get('category_id') as string | null
    const tagsString = formData.get('tags') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: `File type ${file.type} is not allowed` }, { status: 400 })
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` }, { status: 400 })
    }

    // Generate unique filename and path
    const uniqueFilename = generateUniqueFilename(file.name)
    const fileType = await getFileType(file.type)
    const storagePath = `${user.id}/${fileType}/${uniqueFilename}`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload file: ' + uploadError.message }, { status: 500 })
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(uploadData.path)

    // Parse tags
    const tags = tagsString ? tagsString.split(',').map(t => t.trim()).filter(Boolean) : []

    // Get image/video dimensions if applicable
    let width: number | null = null
    let height: number | null = null
    // Note: For a full implementation, you'd extract dimensions here using a library

    // Create database record
    const { data: asset, error: dbError } = await (supabase
      .from('media_assets') as ReturnType<typeof supabase.from>)
      .insert({
        user_id: user.id,
        filename: uniqueFilename,
        original_filename: file.name,
        storage_path: storagePath,
        storage_bucket: STORAGE_BUCKET,
        file_type: fileType,
        mime_type: file.type,
        file_size: file.size,
        width,
        height,
        name: name || file.name.replace(/\.[^.]+$/, ''),
        description,
        alt_text: altText,
        category_id: categoryId || null,
        tags,
        public_url: publicUrl,
        metadata: {},
      } as Record<string, unknown>)
      .select()
      .single()

    if (dbError) {
      console.error('Database insert error:', dbError)
      // Try to clean up the uploaded file
      await supabase.storage.from(STORAGE_BUCKET).remove([storagePath])
      return NextResponse.json({ error: 'Failed to save asset metadata' }, { status: 500 })
    }

    return NextResponse.json({ success: true, asset })
  } catch (error) {
    console.error('Media upload error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    )
  }
}

// GET - List media assets
export async function GET(request: NextRequest) {
  try {
    const owner = await isOwner()
    if (!owner) {
      return NextResponse.json({ error: 'Owner access required' }, { status: 403 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const fileType = searchParams.get('file_type')
    const categoryId = searchParams.get('category_id')
    const search = searchParams.get('search')
    const favoritesOnly = searchParams.get('favorites') === 'true'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('media_assets')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (fileType) {
      query = query.eq('file_type', fileType)
    }

    if (categoryId) {
      query = query.eq('category_id', categoryId)
    }

    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    if (favoritesOnly) {
      query = query.eq('is_favorite', true)
    }

    query = query.range(offset, offset + limit - 1)

    const { data, count, error } = await query

    if (error) {
      console.error('Error fetching media assets:', error)
      return NextResponse.json({ error: 'Failed to fetch assets' }, { status: 500 })
    }

    return NextResponse.json({
      assets: data || [],
      total: count || 0,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Media list error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list assets' },
      { status: 500 }
    )
  }
}
