import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

// Valid early access codes - these are the codes you share with users
const VALID_ACCESS_CODES = [
  'KACHOWAI.2026',
  'KACHOW2024',
  'EARLYBIRD',
  'INSTAGRAM',
  'MILLER-VIP',
  'FOUNDER',
]

// Initialize Supabase with service role for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Initialize Resend for email
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, fullName, accessCode } = body

    // Validate required fields
    if (!email || !accessCode) {
      return NextResponse.json(
        { error: 'Email and access code are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      )
    }

    // Validate access code
    const normalizedCode = accessCode.toUpperCase().trim()
    if (!VALID_ACCESS_CODES.includes(normalizedCode)) {
      return NextResponse.json(
        { error: 'Invalid access code. Please check the code and try again.' },
        { status: 400 }
      )
    }

    // Get request metadata
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Check if email already exists
    const { data: existing } = await supabase
      .from('early_access_signups')
      .select('id, email')
      .eq('email', email.toLowerCase())
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'This email is already registered for early access!' },
        { status: 409 }
      )
    }

    // Insert new signup
    const { data: signup, error: insertError } = await supabase
      .from('early_access_signups')
      .insert({
        email: email.toLowerCase(),
        full_name: fullName || null,
        access_code: normalizedCode,
        ip_address: ip,
        user_agent: userAgent,
        source: 'landing_page',
      })
      .select()
      .single()

    if (insertError) {
      console.error('Signup insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to process signup. Please try again.' },
        { status: 500 }
      )
    }

    // Send welcome email via Resend
    let emailSent = false
    if (resend) {
      try {
        await resend.emails.send({
          from: 'Kachow AI <noreply@kachow.app>',
          to: email,
          subject: 'Welcome to Kachow AI - Your Free Lifetime Access is Confirmed!',
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                <div style="text-align: center; margin-bottom: 40px;">
                  <img src="https://kachow.app/logos/kachow.png" alt="Kachow AI" width="80" height="80" style="border-radius: 16px;">
                </div>

                <div style="background: linear-gradient(135deg, #18181b 0%, #27272a 100%); border-radius: 16px; padding: 40px; border: 1px solid #3f3f46;">
                  <h1 style="color: #fafafa; font-size: 28px; font-weight: 700; margin: 0 0 16px 0; text-align: center;">
                    Welcome to Kachow AI!
                  </h1>

                  <p style="color: #a1a1aa; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0; text-align: center;">
                    ${fullName ? `Hey ${fullName},` : 'Hey there,'} you're officially on the early access list!
                  </p>

                  <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 12px; padding: 24px; margin: 24px 0;">
                    <p style="color: #000; font-size: 14px; font-weight: 600; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px;">
                      Your Access
                    </p>
                    <p style="color: #000; font-size: 24px; font-weight: 700; margin: 0;">
                      FREE LIFETIME ACCESS
                    </p>
                    <p style="color: rgba(0,0,0,0.7); font-size: 14px; margin: 8px 0 0 0;">
                      (Normally $23.99/month)
                    </p>
                  </div>

                  <p style="color: #a1a1aa; font-size: 15px; line-height: 1.6; margin: 24px 0;">
                    You're one of the first to get access to Kachow AI - the next-generation AI assistant for content creators. We're putting the finishing touches on the platform and will notify you the moment it's ready.
                  </p>

                  <div style="text-align: center; margin: 32px 0;">
                    <a href="https://kachow.app" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #000; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      Visit Kachow.app
                    </a>
                  </div>
                </div>

                <div style="text-align: center; margin-top: 32px;">
                  <p style="color: #71717a; font-size: 13px; margin: 0;">
                    Kachow AI by Miller AI Group
                  </p>
                  <p style="color: #52525b; font-size: 12px; margin: 8px 0 0 0;">
                    You received this email because you signed up for early access.
                  </p>
                </div>
              </div>
            </body>
            </html>
          `,
        })
        emailSent = true

        // Update the signup record
        await supabase
          .from('early_access_signups')
          .update({ email_sent: true, email_sent_at: new Date().toISOString() })
          .eq('id', signup.id)
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError)
        // Don't fail the signup if email fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Welcome to Kachow AI! Check your email for confirmation.',
      emailSent,
    })
  } catch (error) {
    console.error('Early access signup error:', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}

// GET endpoint to check signup stats (admin only)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const adminKey = searchParams.get('key')

    // Simple admin key check
    if (adminKey !== process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(-10)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: signups, error } = await supabase
      .from('early_access_signups')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch signups' }, { status: 500 })
    }

    return NextResponse.json({
      total: signups?.length || 0,
      signups: signups || [],
    })
  } catch (_error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
