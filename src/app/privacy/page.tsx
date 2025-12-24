import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Privacy Policy | Miller AI Group',
  description: 'Privacy Policy for Miller AI Group and its services.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logos/miller-ai-group.svg"
              alt="Miller AI Group"
              width={36}
              height={36}
              className="w-9 h-9"
            />
            <span className="font-bold text-lg">Miller AI Group</span>
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link href="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Link>
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: December 23, 2024</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              Miller AI Group (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) respects your privacy and is committed to protecting your personal data. This privacy policy explains how we collect, use, and safeguard your information when you use our website and services, including Kachow AI, Stuntman AI, and BrainBox.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Information We Collect</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We may collect the following types of information:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">Account Information:</strong> When you create an account, we collect your name, email address, and authentication data through GitHub OAuth.</li>
              <li><strong className="text-foreground">Usage Data:</strong> We collect information about how you interact with our services, including pages visited, features used, and time spent on the platform.</li>
              <li><strong className="text-foreground">User Content:</strong> Notes, links, goals, files, and other content you create within our platform are stored securely.</li>
              <li><strong className="text-foreground">Device Information:</strong> We may collect information about your device, browser type, and IP address for security and analytics purposes.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We use the information we collect to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Provide, maintain, and improve our services</li>
              <li>Authenticate your identity and manage your account</li>
              <li>Process and store your user-generated content</li>
              <li>Send important service updates and notifications</li>
              <li>Analyze usage patterns to enhance user experience</li>
              <li>Ensure security and prevent fraudulent activity</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Data Storage and Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your data is stored securely using Supabase, which provides enterprise-grade security with encryption at rest and in transit. We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Third-Party Services</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We use the following third-party services:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">Supabase:</strong> Database and authentication services</li>
              <li><strong className="text-foreground">GitHub:</strong> OAuth authentication provider</li>
              <li><strong className="text-foreground">Vercel:</strong> Hosting and deployment platform</li>
              <li><strong className="text-foreground">Groq:</strong> AI model inference for our AI features</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Each of these services has their own privacy policies governing how they handle your data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              You have the right to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your account and associated data</li>
              <li>Export your data in a portable format</li>
              <li>Withdraw consent for data processing</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use essential cookies to maintain your session and authentication state. We do not use tracking cookies or third-party advertising cookies.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your personal data for as long as your account is active or as needed to provide you services. You can request deletion of your account at any time, and we will remove your data within 30 days of the request.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Children&apos;s Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our services are not directed to individuals under the age of 13. We do not knowingly collect personal information from children under 13. If we become aware that we have collected personal data from a child under 13, we will take steps to delete that information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this privacy policy from time to time. We will notify you of any changes by posting the new privacy policy on this page and updating the &quot;Last updated&quot; date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about this privacy policy or our data practices, please contact us through our social media channels or by reaching out via the contact information on our website.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-border">
          <Link href="/" className="text-amber-500 hover:underline inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </main>
    </div>
  )
}
