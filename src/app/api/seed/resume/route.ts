import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Resume template data - PII loaded from user's auth profile or database
// Do NOT hardcode personal information in source code
const getResumeSummary = (userEmail?: string) => ({
  headline: 'Founder & Entrepreneur | Business & Computer Science Student at BYU',
  summary: `Ambitious entrepreneur and student at Brigham Young University, pursuing dual studies in Business at the Marriott School of Business and Computer Science. Currently building multiple AI-powered ventures through Miller AI Group. Proven track record of leadership as former CEO of CozyFilmz, with experience in strategic planning, partnership negotiations, and brand development. Fluent in Spanish with a strong foundation in operational excellence and customer-focused decision making.`,
  location: 'Provo, Utah',
  email: userEmail || '', // Get from authenticated user
  phone: '', // User should add their own phone in settings
  website: 'https://miller-ai-group.vercel.app',
})

const RESUME_ITEMS = [
  // Education
  {
    title: 'Brigham Young University - Marriott School of Business',
    description: `Bachelor's in Business with Computer Science emphasis
• 3.55 GPA
• Marriott School of Business Student
• Spanish Fluent Certified
• Focus: Entrepreneurship, AI/ML, Software Engineering`,
    category: 'education',
    start_date: '2024-09-01',
    end_date: null,
    is_current: true,
    order_index: 0,
  },
  {
    title: 'Davis High School',
    description: `High School Diploma - Kaysville, UT
• 3.7 GPA
• Honor Roll 2022
• Strong foundation in academics and leadership`,
    category: 'education',
    start_date: '2018-08-01',
    end_date: '2022-05-01',
    is_current: false,
    order_index: 1,
  },
  // Experience
  {
    title: 'Founder & CEO - Miller AI Group',
    description: `Leading AI-focused venture studio building multiple products:
• Kachow - Investor sentiment analysis platform
• StuntMan AI - Cryptocurrency trading bot
• BrainBox AI - Intelligent note-taking with AI insights
• Building full-stack applications with Next.js, TypeScript, and AI integrations`,
    category: 'startup',
    start_date: '2024-06-01',
    end_date: null,
    is_current: true,
    order_index: 2,
  },
  {
    title: 'CEO - CozyFilmz',
    description: `Led company operations and growth strategy
• Achieved company growth by implementing strategic plans and streamlining operations
• Managed and negotiated partnerships by creating contracts and deals
• Implemented cost-saving initiatives to increase company profits
• Marketed and advertised to achieve brand recognition
• Organized local sponsors to cover event costs and support the business`,
    category: 'experience',
    start_date: '2025-01-01',
    end_date: '2025-06-01',
    is_current: false,
    order_index: 3,
  },
  {
    title: 'Warehouse Worker - BadFlag',
    description: `Operations and logistics experience
• Loaded, unloaded and moved material to and from storage to production areas
• Maintained a clean workspace by enforcing housekeeping guidelines
• Reduced order processing time by implementing effective manufacturing and boxing techniques`,
    category: 'experience',
    start_date: '2019-09-01',
    end_date: '2021-09-01',
    is_current: false,
    order_index: 4,
  },
  // Skills
  {
    title: 'Technical Skills',
    description: `• Full-Stack Development (Next.js, React, TypeScript, Node.js)
• AI/ML Integration (Groq, OpenAI, Replicate)
• Database Management (Supabase, PostgreSQL)
• Cloud Deployment (Vercel, AWS)
• Version Control (Git, GitHub)`,
    category: 'skill',
    start_date: null,
    end_date: null,
    is_current: false,
    order_index: 5,
  },
  {
    title: 'Business & Leadership',
    description: `• Effective Decision Making
• Customer Focus
• Entrepreneurial Mindset
• Operational Excellence
• Strategic Planning
• Partnership Negotiations`,
    category: 'skill',
    start_date: null,
    end_date: null,
    is_current: false,
    order_index: 6,
  },
  {
    title: 'Languages',
    description: `• English (Native)
• Spanish (Fluent) - Certified`,
    category: 'skill',
    start_date: null,
    end_date: null,
    is_current: false,
    order_index: 7,
  },
  // Achievements
  {
    title: 'Founded Miller AI Group',
    description: 'Launched AI-focused venture studio with multiple products in development, including investor sentiment analysis and crypto trading platforms.',
    category: 'achievement',
    start_date: '2024-06-01',
    end_date: null,
    is_current: true,
    order_index: 8,
  },
  {
    title: 'BYU Marriott School of Business Admission',
    description: 'Accepted into one of the top-ranked business schools in the nation, known for producing successful entrepreneurs and business leaders.',
    category: 'achievement',
    start_date: '2024-09-01',
    end_date: null,
    is_current: false,
    order_index: 9,
  },
  {
    title: 'Spanish Fluency Certification',
    description: 'Achieved certified fluency in Spanish, enabling communication with Spanish-speaking clients and partners.',
    category: 'achievement',
    start_date: null,
    end_date: null,
    is_current: false,
    order_index: 10,
  },
]

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get resume summary with user's email from auth
    const resumeSummary = getResumeSummary(user.email)

    // Upsert resume summary
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: summaryError } = await (supabase.from('resume_summary') as any)
      .upsert({
        user_id: user.id,
        ...resumeSummary,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })

    if (summaryError) {
      console.error('Summary error:', summaryError)
    }

    // Delete existing resume items for this user
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('resume_items') as any)
      .delete()
      .eq('user_id', user.id)

    // Insert new resume items
    const itemsWithUserId = RESUME_ITEMS.map(item => ({
      ...item,
      user_id: user.id,
      visible: true,
    }))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: itemsError } = await (supabase.from('resume_items') as any)
      .insert(itemsWithUserId)

    if (itemsError) {
      console.error('Items error:', itemsError)
      return NextResponse.json({ error: itemsError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Resume data seeded successfully',
      itemsCount: RESUME_ITEMS.length
    })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json({ error: 'Failed to seed resume data' }, { status: 500 })
  }
}
