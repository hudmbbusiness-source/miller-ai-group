'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ArrowLeft, Shield } from 'lucide-react'

// Stripe-style animated gradient mesh
function StripeMesh() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      <motion.div
        className="absolute w-[800px] h-[800px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 50%)',
          top: '-20%',
          left: '-10%',
          filter: 'blur(80px)',
        }}
        animate={{
          x: [0, 60, 30, 0],
          y: [0, 40, 60, 0],
          scale: [1, 1.1, 0.95, 1],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 50%)',
          bottom: '-15%',
          right: '-5%',
          filter: 'blur(80px)',
        }}
        animate={{
          x: [0, -40, -20, 0],
          y: [0, -40, 20, 0],
          scale: [1, 0.95, 1.1, 1],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut', delay: 5 }}
      />
    </div>
  )
}

const sections = [
  {
    title: 'Introduction',
    content: `Miller AI Group ("we," "our," or "us") respects your privacy and is committed to protecting your personal data. This privacy policy explains how we collect, use, and safeguard your information when you use our website and services, including Kachow AI, Stuntman AI, and BrainBox.`,
  },
  {
    title: 'Information We Collect',
    content: 'We may collect the following types of information:',
    list: [
      { label: 'Account Information', desc: 'When you create an account, we collect your name, email address, and authentication data through GitHub OAuth.' },
      { label: 'Usage Data', desc: 'We collect information about how you interact with our services, including pages visited, features used, and time spent on the platform.' },
      { label: 'User Content', desc: 'Notes, links, goals, files, and other content you create within our platform are stored securely.' },
      { label: 'Device Information', desc: 'We may collect information about your device, browser type, and IP address for security and analytics purposes.' },
    ],
  },
  {
    title: 'How We Use Your Information',
    content: 'We use the information we collect to:',
    list: [
      { desc: 'Provide, maintain, and improve our services' },
      { desc: 'Authenticate your identity and manage your account' },
      { desc: 'Process and store your user-generated content' },
      { desc: 'Send important service updates and notifications' },
      { desc: 'Analyze usage patterns to enhance user experience' },
      { desc: 'Ensure security and prevent fraudulent activity' },
    ],
  },
  {
    title: 'Data Storage and Security',
    content: 'Your data is stored securely using Supabase, which provides enterprise-grade security with encryption at rest and in transit. We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction.',
  },
  {
    title: 'Third-Party Services',
    content: 'We use the following third-party services:',
    list: [
      { label: 'Supabase', desc: 'Database and authentication services' },
      { label: 'GitHub', desc: 'OAuth authentication provider' },
      { label: 'Vercel', desc: 'Hosting and deployment platform' },
      { label: 'Groq', desc: 'AI model inference for our AI features' },
    ],
    footer: 'Each of these services has their own privacy policies governing how they handle your data.',
  },
  {
    title: 'Your Rights',
    content: 'You have the right to:',
    list: [
      { desc: 'Access the personal data we hold about you' },
      { desc: 'Request correction of inaccurate data' },
      { desc: 'Request deletion of your account and associated data' },
      { desc: 'Export your data in a portable format' },
      { desc: 'Withdraw consent for data processing' },
    ],
  },
  {
    title: 'Cookies',
    content: 'We use essential cookies to maintain your session and authentication state. We do not use tracking cookies or third-party advertising cookies.',
  },
  {
    title: 'Data Retention',
    content: 'We retain your personal data for as long as your account is active or as needed to provide you services. You can request deletion of your account at any time, and we will remove your data within 30 days of the request.',
  },
  {
    title: 'Children\'s Privacy',
    content: 'Our services are not directed to individuals under the age of 13. We do not knowingly collect personal information from children under 13. If we become aware that we have collected personal data from a child under 13, we will take steps to delete that information.',
  },
  {
    title: 'Changes to This Policy',
    content: 'We may update this privacy policy from time to time. We will notify you of any changes by posting the new privacy policy on this page and updating the "Last updated" date.',
  },
  {
    title: 'Contact Us',
    content: 'If you have any questions about this privacy policy or our data practices, please contact us through our social media channels or by reaching out via the contact information on our website.',
  },
]

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-black text-white antialiased">
      <StripeMesh />

      {/* Navigation */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed top-0 left-0 right-0 z-50"
      >
        <div className="absolute inset-0 bg-black/70 backdrop-blur-2xl border-b border-white/5" />
        <div className="relative max-w-3xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-3 group">
              <motion.div
                animate={{ y: [0, -2, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Image
                  src="/logos/kachow.png"
                  alt="Kachow AI"
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded-lg"
                />
              </motion.div>
              <span className="font-semibold tracking-tight group-hover:text-violet-300 transition-colors">
                Kachow AI
              </span>
            </Link>
            <Button asChild variant="ghost" size="sm" className="text-neutral-400 hover:text-white hover:bg-white/5">
              <Link href="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Link>
            </Button>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="relative pt-24 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-12"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 backdrop-blur-xl mb-6"
            >
              <Shield className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-medium text-emerald-300 uppercase tracking-widest">Privacy Policy</span>
            </motion.div>

            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">
              <span className="bg-gradient-to-r from-white via-neutral-100 to-neutral-300 bg-clip-text text-transparent">
                Privacy Policy
              </span>
            </h1>
            <p className="text-neutral-500">Last updated: December 23, 2024</p>
          </motion.div>

          {/* Content */}
          <div className="space-y-8">
            {sections.map((section, index) => (
              <motion.section
                key={section.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  'relative overflow-hidden rounded-2xl p-6',
                  'bg-gradient-to-br from-neutral-900/90 to-neutral-900/50',
                  'backdrop-blur-xl border border-white/5',
                  'shadow-xl'
                )}
              >
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-3">
                  <span className="w-1 h-6 bg-gradient-to-b from-violet-500 to-fuchsia-500 rounded-full" />
                  {section.title}
                </h2>
                <p className="text-neutral-400 leading-relaxed mb-4">{section.content}</p>
                {section.list && (
                  <ul className="space-y-3 pl-4">
                    {section.list.map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-neutral-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-2 flex-shrink-0" />
                        <span>
                          {'label' in item && item.label && <strong className="text-white">{item.label}:</strong>}{' '}
                          {item.desc}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {section.footer && (
                  <p className="text-neutral-400 leading-relaxed mt-4">{section.footer}</p>
                )}
              </motion.section>
            ))}
          </div>

          {/* Back Link */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-12 pt-8 border-t border-white/5"
          >
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-violet-400 hover:text-violet-300 transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Back to Home
            </Link>
          </motion.div>
        </div>
      </main>
    </div>
  )
}
