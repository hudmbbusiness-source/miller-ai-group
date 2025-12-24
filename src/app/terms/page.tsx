import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Terms of Service | Miller AI Group',
  description: 'Terms of Service for Miller AI Group and its services.',
}

export default function TermsPage() {
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
        <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">Last updated: December 23, 2024</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">Agreement to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using the services provided by Miller AI Group (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;), including our website, Kachow AI, Stuntman AI, BrainBox, and related applications (collectively, the &quot;Services&quot;), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our Services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Description of Services</h2>
            <p className="text-muted-foreground leading-relaxed">
              Miller AI Group provides AI-powered productivity and automation tools, including but not limited to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-4">
              <li><strong className="text-foreground">Kachow AI:</strong> AI-powered task automation and assistance</li>
              <li><strong className="text-foreground">Stuntman AI:</strong> AI video and media analysis tools</li>
              <li><strong className="text-foreground">BrainBox:</strong> Knowledge management and organization platform</li>
              <li><strong className="text-foreground">Founder Hub:</strong> Personal productivity dashboard with notes, links, goals, and file management</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Account Registration</h2>
            <p className="text-muted-foreground leading-relaxed">
              To access certain features of our Services, you may need to create an account. You agree to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-4">
              <li>Provide accurate and complete information during registration</li>
              <li>Maintain the security of your account credentials</li>
              <li>Notify us immediately of any unauthorized access to your account</li>
              <li>Accept responsibility for all activities that occur under your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Acceptable Use</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              You agree not to use our Services to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe upon the rights of others, including intellectual property rights</li>
              <li>Upload or transmit malicious code, viruses, or harmful content</li>
              <li>Attempt to gain unauthorized access to our systems or other users&apos; accounts</li>
              <li>Interfere with or disrupt the integrity or performance of our Services</li>
              <li>Engage in any activity that could harm, disable, or overburden our infrastructure</li>
              <li>Use automated systems to access the Services without our written permission</li>
              <li>Collect or harvest user data without consent</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">User Content</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              You retain ownership of any content you create, upload, or store using our Services (&quot;User Content&quot;). By using our Services, you grant us a limited license to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Store and process your User Content to provide the Services</li>
              <li>Create backups of your User Content for data protection purposes</li>
              <li>Display your User Content to you through our interfaces</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              You are solely responsible for your User Content and must ensure it does not violate any laws or third-party rights.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Services, including all content, features, and functionality (excluding User Content), are owned by Miller AI Group and are protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, sell, or lease any part of our Services without our written permission.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">AI-Generated Content</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our Services utilize artificial intelligence to generate content, recommendations, and analysis. You acknowledge that:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-4">
              <li>AI-generated content may not always be accurate or complete</li>
              <li>You are responsible for reviewing and verifying any AI-generated output before relying on it</li>
              <li>We do not guarantee the accuracy, reliability, or suitability of AI-generated content for any purpose</li>
              <li>AI outputs should not be considered professional advice (legal, financial, medical, etc.)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Service Availability</h2>
            <p className="text-muted-foreground leading-relaxed">
              We strive to maintain high availability of our Services but do not guarantee uninterrupted access. We may temporarily suspend or modify the Services for maintenance, updates, or other operational reasons. We will attempt to provide reasonable notice when possible.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              To the maximum extent permitted by law, Miller AI Group and its affiliates, officers, employees, and agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits, revenue, data, or use, arising out of or related to your use of the Services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Disclaimer of Warranties</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Services are provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, either express or implied. We disclaim all warranties, including implied warranties of merchantability, fitness for a particular purpose, and non-infringement.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may suspend or terminate your access to the Services at any time, with or without cause, and with or without notice. You may also terminate your account at any time by contacting us. Upon termination, your right to use the Services will immediately cease.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify these Terms of Service at any time. We will notify users of material changes by posting the updated terms on our website. Your continued use of the Services after such changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms of Service shall be governed by and construed in accordance with the laws of the State of Utah, United States, without regard to its conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Contact Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about these Terms of Service, please contact us through our social media channels or by reaching out via the contact information on our website.
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
