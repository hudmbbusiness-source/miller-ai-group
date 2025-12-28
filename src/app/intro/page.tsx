import { redirect } from 'next/navigation'

// Redirect /intro to /login - intro video has been removed
// The hacker OS experience now starts from the login page
export default function IntroPage() {
  redirect('/login')
}
