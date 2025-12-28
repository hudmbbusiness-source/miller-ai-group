'use client'

import { motion, useScroll, useTransform, useSpring, useInView, Variants } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useRef, useEffect, useState, ReactNode } from 'react'
import Link from 'next/link'
import Image from 'next/image'

// Stripe-style gradient mesh background
export function StripeMesh({ className }: { className?: string }) {
  return (
    <div className={cn('absolute inset-0 overflow-hidden pointer-events-none', className)}>
      {/* Primary gradient orbs - smooth movement */}
      <motion.div
        className="absolute w-[1000px] h-[1000px] rounded-full opacity-40"
        style={{
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 60%)',
          top: '-30%',
          left: '-20%',
          filter: 'blur(60px)',
        }}
        animate={{
          x: [0, 100, 50, 0],
          y: [0, 50, 100, 0],
          scale: [1, 1.1, 0.95, 1],
        }}
        transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute w-[800px] h-[800px] rounded-full opacity-30"
        style={{
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, transparent 60%)',
          top: '10%',
          right: '-15%',
          filter: 'blur(60px)',
        }}
        animate={{
          x: [0, -80, -40, 0],
          y: [0, 80, 40, 0],
          scale: [1, 0.9, 1.1, 1],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut', delay: 5 }}
      />
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full opacity-25"
        style={{
          background: 'radial-gradient(circle, rgba(236, 72, 153, 0.25) 0%, transparent 60%)',
          bottom: '-10%',
          left: '30%',
          filter: 'blur(60px)',
        }}
        animate={{
          x: [0, 60, -30, 0],
          y: [0, -60, 30, 0],
          scale: [1, 1.15, 0.9, 1],
        }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut', delay: 10 }}
      />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
        }}
      />
    </div>
  )
}

// Animated floating logo with glow
export function AnimatedLogo({
  src,
  alt,
  size = 40,
  className,
  glowColor = 'violet',
}: {
  src: string
  alt: string
  size?: number
  className?: string
  glowColor?: 'violet' | 'blue' | 'amber' | 'pink'
}) {
  const glowColors = {
    violet: 'rgba(139, 92, 246, 0.4)',
    blue: 'rgba(59, 130, 246, 0.4)',
    amber: 'rgba(245, 158, 11, 0.4)',
    pink: 'rgba(236, 72, 153, 0.4)',
  }

  return (
    <motion.div
      className={cn('relative', className)}
      animate={{
        y: [0, -4, 0],
      }}
      transition={{
        duration: 4,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      <motion.div
        className="absolute inset-0 rounded-xl blur-xl"
        style={{ backgroundColor: glowColors[glowColor] }}
        animate={{
          opacity: [0.3, 0.6, 0.3],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <Image
        src={src}
        alt={alt}
        width={size}
        height={size}
        className="relative rounded-xl"
      />
    </motion.div>
  )
}

// Stripe-style navigation
export function StripeNav({
  logo,
  logoText,
  links,
  ctaText,
  ctaHref,
}: {
  logo: { src: string; alt: string }
  logoText: string
  links: Array<{ label: string; href: string }>
  ctaText: string
  ctaHref: string
}) {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="fixed top-0 left-0 right-0 z-50"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-2xl border-b border-white/5" />
      <div className="relative max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-3 group">
            <AnimatedLogo src={logo.src} alt={logo.alt} size={32} />
            <span className="font-semibold text-lg tracking-tight group-hover:text-violet-400 transition-colors">
              {logoText}
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-neutral-400 hover:text-white transition-colors relative group"
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 group-hover:w-full transition-all duration-300" />
              </Link>
            ))}
          </div>

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Link
              href={ctaHref}
              className="relative group px-5 py-2.5 rounded-xl text-sm font-medium overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500" />
              <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="relative text-white">{ctaText}</span>
            </Link>
          </motion.div>
        </div>
      </div>
    </motion.nav>
  )
}

// Stripe-style hero badge
export function HeroBadge({
  icon: Icon,
  text,
  color = 'violet',
}: {
  icon?: React.ComponentType<{ className?: string }>
  text: string
  color?: 'violet' | 'blue' | 'emerald' | 'amber'
}) {
  const colors = {
    violet: 'bg-violet-500/10 border-violet-500/30 text-violet-400',
    blue: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    emerald: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    amber: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className={cn(
        'inline-flex items-center gap-2 px-4 py-2 rounded-full border backdrop-blur-sm',
        colors[color]
      )}
    >
      {Icon && (
        <motion.div
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 4, repeat: Infinity }}
        >
          <Icon className="w-4 h-4" />
        </motion.div>
      )}
      <span className="text-xs font-medium uppercase tracking-wider">{text}</span>
    </motion.div>
  )
}

// Animated counter with spring physics
export function AnimatedCounter({
  value,
  suffix = '',
  prefix = '',
  className,
  duration = 2,
}: {
  value: number
  suffix?: string
  prefix?: string
  className?: string
  duration?: number
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true })
  const spring = useSpring(0, { duration: duration * 1000 })
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    if (isInView) {
      spring.set(value)
    }
  }, [isInView, value, spring])

  useEffect(() => {
    return spring.on('change', (v) => setDisplayValue(Math.round(v)))
  }, [spring])

  return (
    <span ref={ref} className={cn('stat-counter', className)}>
      {prefix}{displayValue}{suffix}
    </span>
  )
}

// Stripe-style premium card
export function StripeCard({
  children,
  className,
  delay = 0,
  hover = true,
}: {
  children: ReactNode
  className?: string
  delay?: number
  hover?: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay }}
      whileHover={hover ? { y: -4, scale: 1.01 } : undefined}
      className={cn(
        'relative overflow-hidden rounded-2xl',
        'bg-gradient-to-br from-neutral-900/90 to-neutral-900/50',
        'backdrop-blur-xl border border-white/5',
        'shadow-2xl shadow-black/20',
        'transition-all duration-300',
        hover && 'hover:border-violet-500/20 hover:shadow-violet-500/5',
        className
      )}
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />

      {/* Content */}
      <div className="relative">{children}</div>
    </motion.div>
  )
}

// Stripe-style section header
export function SectionHeader({
  badge,
  badgeIcon: BadgeIcon,
  title,
  description,
  className,
  align = 'center',
}: {
  badge?: string
  badgeIcon?: React.ComponentType<{ className?: string }>
  title: string
  description?: string
  className?: string
  align?: 'left' | 'center'
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={cn(
        'mb-12',
        align === 'center' && 'text-center',
        className
      )}
    >
      {badge && (
        <div className={cn('mb-4', align === 'center' && 'flex justify-center')}>
          <HeroBadge icon={BadgeIcon} text={badge} />
        </div>
      )}
      <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
        <span className="bg-gradient-to-r from-white via-neutral-200 to-neutral-400 bg-clip-text text-transparent">
          {title}
        </span>
      </h2>
      {description && (
        <p className={cn(
          'text-lg text-neutral-400 leading-relaxed',
          align === 'center' && 'max-w-2xl mx-auto'
        )}>
          {description}
        </p>
      )}
    </motion.div>
  )
}

// Stripe-style footer
export function StripeFooter({
  logo,
  logoText,
  links,
  socials,
  copyright,
}: {
  logo: { src: string; alt: string }
  logoText: string
  links: Array<{ label: string; href: string }>
  socials: Array<{ icon: React.ComponentType<{ className?: string }>; href: string }>
  copyright: string
}) {
  return (
    <footer className="relative border-t border-white/5 bg-black/50 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Image
              src={logo.src}
              alt={logo.alt}
              width={24}
              height={24}
              className="w-6 h-6 rounded"
            />
            <span className="text-sm text-neutral-400">{logoText}</span>
          </div>

          <div className="flex items-center gap-6 text-sm text-neutral-500">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="hover:text-white transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-4">
            {socials.map((social, index) => (
              <a
                key={index}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-neutral-500 hover:text-white transition-colors"
              >
                <social.icon className="w-5 h-5" />
              </a>
            ))}
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-white/5 text-center">
          <p className="text-sm text-neutral-500">{copyright}</p>
        </div>
      </div>
    </footer>
  )
}

// Stripe-style gradient button
export function GradientButton({
  children,
  className,
  size = 'md',
  variant = 'primary',
  href,
  onClick,
}: {
  children: ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'primary' | 'secondary'
  href?: string
  onClick?: () => void
}) {
  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-sm',
    lg: 'px-8 py-4 text-base',
  }

  const Component = href ? Link : 'button'
  const componentProps = href ? { href } : { onClick }

  return (
    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
      <Component
        {...(componentProps as any)}
        className={cn(
          'relative group inline-flex items-center justify-center gap-2 rounded-xl font-medium overflow-hidden transition-all',
          sizes[size],
          variant === 'primary' && 'text-white',
          variant === 'secondary' && 'text-white border border-white/10 bg-white/5 hover:bg-white/10',
          className
        )}
      >
        {variant === 'primary' && (
          <>
            <div className="absolute inset-0 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500" />
            <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 opacity-0 group-hover:opacity-100 transition-opacity" />
          </>
        )}
        <span className="relative">{children}</span>
      </Component>
    </motion.div>
  )
}

// Stagger container for child animations
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
}

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
}

// Page wrapper with consistent background
export function PageWrapper({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('min-h-screen bg-black text-white antialiased', className)}>
      <StripeMesh />
      {children}
    </div>
  )
}
