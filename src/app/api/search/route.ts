import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export interface SearchResult {
  id: string
  type: 'note' | 'link' | 'goal' | 'asset' | 'board' | 'page'
  title: string
  description: string | null
  url: string
  matchedField: string
}

// Static site pages for navigation
const sitePages = [
  { id: 'page-dashboard', title: 'Dashboard', description: 'Main dashboard with overview and stats', url: '/app', keywords: ['home', 'main', 'overview', 'hub'] },
  { id: 'page-profile', title: 'Profile', description: 'View your profile and resume information', url: '/app', keywords: ['me', 'about', 'resume', 'cv'] },
  { id: 'page-notes', title: 'Notes', description: 'Create and manage your personal notes', url: '/app/notes', keywords: ['write', 'document', 'memo', 'text'] },
  { id: 'page-links', title: 'Saved Links', description: 'Bookmarked websites and resources', url: '/app/links', keywords: ['bookmarks', 'urls', 'websites', 'resources'] },
  { id: 'page-goals', title: 'Goals', description: 'Track your personal and professional goals', url: '/app/goals', keywords: ['objectives', 'targets', 'milestones', 'achievements'] },
  { id: 'page-assets', title: 'Assets & Wishlist', description: 'Track items you want, own, or are working towards', url: '/app/assets', keywords: ['wishlist', 'items', 'shopping', 'wants', 'owned'] },
  { id: 'page-boards', title: 'Vision Boards', description: 'Create visual boards for ideas and inspiration', url: '/app/boards', keywords: ['images', 'inspiration', 'mood', 'vision'] },
  { id: 'page-files', title: 'Files', description: 'Upload and manage your files', url: '/app/files', keywords: ['documents', 'uploads', 'storage', 'media'] },
  { id: 'page-settings', title: 'Settings', description: 'Customize your account and preferences', url: '/app/settings', keywords: ['preferences', 'account', 'config', 'options', 'customize'] },
  { id: 'page-zuckerberg', title: 'Zuckerberg Mode', description: 'AI-powered insights and analysis', url: '/app/zuckerberg', keywords: ['ai', 'insights', 'analytics', 'intelligence', 'data'] },
  { id: 'page-brainbox', title: 'BrainBox', description: 'AI assistant for research and brainstorming', url: '/app/tools/brainbox', keywords: ['ai', 'chat', 'assistant', 'research', 'brainstorm'] },
  { id: 'page-kachow', title: 'Kachow', description: 'Quick actions and productivity tools', url: '/app/tools/kachow', keywords: ['quick', 'actions', 'productivity', 'tools'] },
  { id: 'page-stuntman', title: 'Stuntman', description: 'Automation and workflow tools', url: '/app/tools/stuntman', keywords: ['automation', 'workflow', 'tasks'] },
]

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')?.toLowerCase().trim()

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] })
    }

    const results: SearchResult[] = []

    // Search site pages first (no auth required for these)
    for (const page of sitePages) {
      const titleMatch = page.title.toLowerCase().includes(query)
      const descMatch = page.description.toLowerCase().includes(query)
      const keywordMatch = page.keywords.some(k => k.toLowerCase().includes(query) || query.includes(k.toLowerCase()))

      if (titleMatch || descMatch || keywordMatch) {
        results.push({
          id: page.id,
          type: 'page',
          title: page.title,
          description: page.description,
          url: page.url,
          matchedField: titleMatch ? 'title' : descMatch ? 'description' : 'keywords',
        })
      }
    }

    // Search notes
    const { data: notes } = await supabase
      .from('notes')
      .select('id, title, content')
      .eq('user_id', user.id)
      .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
      .limit(10) as { data: Array<{ id: string; title: string; content: string | null }> | null }

    if (notes) {
      for (const note of notes) {
        let matchedField = 'title'
        if (!note.title.toLowerCase().includes(query) && note.content?.toLowerCase().includes(query)) {
          matchedField = 'content'
        }
        results.push({
          id: note.id,
          type: 'note',
          title: note.title,
          description: note.content?.substring(0, 100) || null,
          url: '/app/notes',
          matchedField,
        })
      }
    }

    // Search links
    const { data: links } = await supabase
      .from('saved_links')
      .select('id, title, description, url')
      .eq('user_id', user.id)
      .or(`title.ilike.%${query}%,description.ilike.%${query}%,url.ilike.%${query}%`)
      .limit(10) as { data: Array<{ id: string; title: string; description: string | null; url: string }> | null }

    if (links) {
      for (const link of links) {
        let matchedField = 'title'
        if (!link.title.toLowerCase().includes(query)) {
          if (link.description?.toLowerCase().includes(query)) {
            matchedField = 'description'
          } else if (link.url.toLowerCase().includes(query)) {
            matchedField = 'url'
          }
        }
        results.push({
          id: link.id,
          type: 'link',
          title: link.title,
          description: link.description || link.url,
          url: '/app/links',
          matchedField,
        })
      }
    }

    // Search goals
    const { data: goals } = await supabase
      .from('goals')
      .select('id, title, description')
      .eq('user_id', user.id)
      .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
      .limit(10) as { data: Array<{ id: string; title: string; description: string | null }> | null }

    if (goals) {
      for (const goal of goals) {
        let matchedField = 'title'
        if (!goal.title.toLowerCase().includes(query) && goal.description?.toLowerCase().includes(query)) {
          matchedField = 'description'
        }
        results.push({
          id: goal.id,
          type: 'goal',
          title: goal.title,
          description: goal.description,
          url: '/app/goals',
          matchedField,
        })
      }
    }

    // Search assets
    const { data: assets } = await supabase
      .from('assets')
      .select('id, name, description, notes')
      .eq('user_id', user.id)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%,notes.ilike.%${query}%`)
      .limit(10) as { data: Array<{ id: string; name: string; description: string | null; notes: string | null }> | null }

    if (assets) {
      for (const asset of assets) {
        let matchedField = 'name'
        if (!asset.name.toLowerCase().includes(query)) {
          if (asset.description?.toLowerCase().includes(query)) {
            matchedField = 'description'
          } else if (asset.notes?.toLowerCase().includes(query)) {
            matchedField = 'notes'
          }
        }
        results.push({
          id: asset.id,
          type: 'asset',
          title: asset.name,
          description: asset.description || asset.notes,
          url: '/app/assets',
          matchedField,
        })
      }
    }

    // Search boards
    const { data: boards } = await supabase
      .from('boards')
      .select('id, name, description')
      .eq('user_id', user.id)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
      .limit(10) as { data: Array<{ id: string; name: string; description: string | null }> | null }

    if (boards) {
      for (const board of boards) {
        let matchedField = 'name'
        if (!board.name.toLowerCase().includes(query) && board.description?.toLowerCase().includes(query)) {
          matchedField = 'description'
        }
        results.push({
          id: board.id,
          type: 'board',
          title: board.name,
          description: board.description,
          url: `/app/boards/${board.id}`,
          matchedField,
        })
      }
    }

    // Sort by relevance (title matches first)
    results.sort((a, b) => {
      const aInTitle = a.title.toLowerCase().includes(query) ? 0 : 1
      const bInTitle = b.title.toLowerCase().includes(query) ? 0 : 1
      return aInTitle - bInTitle
    })

    // Limit total results
    const limitedResults = results.slice(0, 20)

    return NextResponse.json({ results: limitedResults })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Failed to search' },
      { status: 500 }
    )
  }
}
