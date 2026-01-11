'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Send,
  CheckCircle,
  Loader2,
  MessageSquare,
  Briefcase,
  Handshake,
  X,
} from 'lucide-react'

const inquiryTypes = [
  { value: 'general', label: 'General Inquiry', icon: MessageSquare },
  { value: 'business', label: 'Business Proposal', icon: Briefcase },
  { value: 'partnership', label: 'Partnership / Offer', icon: Handshake },
]

interface InquiryFormProps {
  isOpen: boolean
  onClose: () => void
}

export function InquiryForm({ isOpen, onClose }: InquiryFormProps) {
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    type: 'general',
    message: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formState),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      setIsSubmitted(true)
    } catch {
      setError('Failed to send message. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    onClose()
    // Reset form after animation
    setTimeout(() => {
      setFormState({ name: '', email: '', type: 'general', message: '' })
      setIsSubmitted(false)
      setError('')
    }, 300)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              className={cn(
                'relative w-full max-w-lg overflow-hidden rounded-2xl',
                'bg-gradient-to-br from-neutral-900 to-neutral-950',
                'border border-white/10 shadow-2xl shadow-violet-500/10'
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 p-2 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Glow effect */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-violet-500/20 rounded-full blur-3xl" />
              <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl" />

              <div className="relative p-6 sm:p-8">
                {isSubmitted ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-8"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', delay: 0.1 }}
                      className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto mb-4"
                    >
                      <CheckCircle className="w-8 h-8 text-white" />
                    </motion.div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                      Message Sent
                    </h3>
                    <p className="text-neutral-400 mb-6">
                      Thanks for reaching out. I&apos;ll get back to you soon.
                    </p>
                    <Button
                      onClick={handleClose}
                      className="bg-gradient-to-r from-violet-500 to-purple-600 text-white border-0"
                    >
                      Close
                    </Button>
                  </motion.div>
                ) : (
                  <>
                    <div className="mb-6">
                      <h2 className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
                        Get in Touch
                      </h2>
                      <p className="text-neutral-400 mt-1">
                        Have an inquiry or offer? I&apos;d love to hear from you.
                      </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      {/* Inquiry Type */}
                      <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">
                          Type
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {inquiryTypes.map((type) => (
                            <button
                              key={type.value}
                              type="button"
                              onClick={() =>
                                setFormState({ ...formState, type: type.value })
                              }
                              className={cn(
                                'flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all',
                                formState.type === type.value
                                  ? 'border-violet-500 bg-violet-500/10 text-violet-400'
                                  : 'border-white/10 bg-white/5 text-neutral-400 hover:border-white/20'
                              )}
                            >
                              <type.icon className="w-5 h-5" />
                              <span className="text-xs font-medium">
                                {type.label}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Name & Email */}
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-neutral-300 mb-2">
                            Name
                          </label>
                          <input
                            type="text"
                            required
                            value={formState.name}
                            onChange={(e) =>
                              setFormState({ ...formState, name: e.target.value })
                            }
                            className={cn(
                              'w-full px-4 py-3 rounded-xl',
                              'bg-white/5 border border-white/10',
                              'text-white placeholder-neutral-500',
                              'focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50',
                              'transition-all'
                            )}
                            placeholder="Your name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-neutral-300 mb-2">
                            Email
                          </label>
                          <input
                            type="email"
                            required
                            value={formState.email}
                            onChange={(e) =>
                              setFormState({ ...formState, email: e.target.value })
                            }
                            className={cn(
                              'w-full px-4 py-3 rounded-xl',
                              'bg-white/5 border border-white/10',
                              'text-white placeholder-neutral-500',
                              'focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50',
                              'transition-all'
                            )}
                            placeholder="you@example.com"
                          />
                        </div>
                      </div>

                      {/* Message */}
                      <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">
                          Message
                        </label>
                        <textarea
                          required
                          value={formState.message}
                          onChange={(e) =>
                            setFormState({ ...formState, message: e.target.value })
                          }
                          rows={4}
                          className={cn(
                            'w-full px-4 py-3 rounded-xl resize-none',
                            'bg-white/5 border border-white/10',
                            'text-white placeholder-neutral-500',
                            'focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50',
                            'transition-all'
                          )}
                          placeholder="Tell me about your inquiry or offer..."
                        />
                      </div>

                      {error && (
                        <p className="text-sm text-red-400">{error}</p>
                      )}

                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white border-0 shadow-lg shadow-violet-500/25 h-12"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            Send Message
                            <Send className="w-4 h-4" />
                          </>
                        )}
                      </Button>
                    </form>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
