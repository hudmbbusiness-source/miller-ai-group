import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/app'
  const error_description = searchParams.get('error_description')

  // Handle OAuth errors from GitHub
  if (error_description) {
    console.error('OAuth error:', error_description)
    return NextResponse.redirect(`${origin}/login?error=oauth_error`)
  }

  if (code) {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error('Session exchange error:', error.message)
        return NextResponse.redirect(`${origin}/login?error=session_error`)
      }

      if (data.session) {
        // Store the provider token in user metadata for later use
        // This is necessary because provider_token is only available during initial auth
        if (data.session.provider_token) {
          await supabase.auth.updateUser({
            data: {
              github_access_token: data.session.provider_token,
              github_token_updated_at: new Date().toISOString(),
            }
          })
          console.log('GitHub provider token stored in user metadata')
        }

        // Session successfully created - determine redirect URL
        const forwardedHost = request.headers.get('x-forwarded-host')
        const isLocalEnv = process.env.NODE_ENV === 'development'

        let redirectUrl: string
        if (isLocalEnv) {
          redirectUrl = `${origin}${next}`
        } else if (forwardedHost) {
          redirectUrl = `https://${forwardedHost}${next}`
        } else {
          redirectUrl = `${origin}${next}`
        }

        console.log('Auth successful, redirecting to:', redirectUrl)
        return NextResponse.redirect(redirectUrl)
      }
    } catch (err) {
      console.error('Auth callback error:', err)
      return NextResponse.redirect(`${origin}/login?error=callback_error`)
    }
  }

  // No code provided - redirect to login
  return NextResponse.redirect(`${origin}/login?error=no_code`)
}
