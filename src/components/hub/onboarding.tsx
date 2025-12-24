'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Rocket,
  Target,
  Sparkles,
  Github,
  ArrowRight,
  Check,
  User,
  Briefcase,
  Code,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface OnboardingStep {
  id: string
  title: string
  description: string
  icon: React.ReactNode
}

const steps: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Miller AI Group',
    description: "Let's personalize your experience",
    icon: <Rocket className="w-8 h-8" />,
  },
  {
    id: 'profile',
    title: 'Tell us about yourself',
    description: 'Help us understand your background',
    icon: <User className="w-8 h-8" />,
  },
  {
    id: 'goals',
    title: 'Set your career goals',
    description: 'What are you working towards?',
    icon: <Target className="w-8 h-8" />,
  },
  {
    id: 'skills',
    title: 'Add your skills',
    description: 'What technologies do you work with?',
    icon: <Code className="w-8 h-8" />,
  },
  {
    id: 'complete',
    title: "You're all set!",
    description: 'Start exploring your personal hub',
    icon: <Sparkles className="w-8 h-8" />,
  },
]

const suggestedSkills = [
  'JavaScript', 'TypeScript', 'Python', 'React', 'Next.js', 'Node.js',
  'AI/ML', 'Data Science', 'Cloud', 'DevOps', 'Mobile', 'UI/UX',
  'Rust', 'Go', 'Java', 'C++', 'Swift', 'Kotlin',
]

const yearOptions = [
  { value: 'freshman', label: 'Freshman' },
  { value: 'sophomore', label: 'Sophomore' },
  { value: 'junior', label: 'Junior' },
  { value: 'senior', label: 'Senior' },
  { value: 'graduate', label: 'Graduate Student' },
  { value: 'professional', label: 'Professional' },
]

export function OnboardingDialog() {
  const [open, setOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form state
  const [careerGoal, setCareerGoal] = useState('')
  const [targetRole, setTargetRole] = useState('')
  const [currentYear, setCurrentYear] = useState('')
  const [skills, setSkills] = useState<string[]>([])
  const [customSkill, setCustomSkill] = useState('')

  // Check if onboarding is needed
  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          setLoading(false)
          return
        }

        // Check if user has completed onboarding
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase.from('site_content') as any)
          .select('value')
          .eq('user_id', user.id)
          .eq('key', 'onboarding_completed')
          .single()

        if (!data?.value) {
          // Also load any existing preferences
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: prefs } = await (supabase.from('site_content') as any)
            .select('value')
            .eq('user_id', user.id)
            .eq('key', 'user_preferences')
            .single()

          if (prefs?.value) {
            setCareerGoal(prefs.value.careerGoal || '')
            setTargetRole(prefs.value.targetRole || '')
            setCurrentYear(prefs.value.currentYear || '')
            setSkills(prefs.value.skills || [])
          }

          setOpen(true)
        }
      } catch (error) {
        console.error('Onboarding check error:', error)
      } finally {
        setLoading(false)
      }
    }

    checkOnboarding()
  }, [])

  const handleAddSkill = (skill: string) => {
    if (skill && !skills.includes(skill)) {
      setSkills([...skills, skill])
    }
    setCustomSkill('')
  }

  const handleRemoveSkill = (skill: string) => {
    setSkills(skills.filter(s => s !== skill))
  }

  const handleNext = async () => {
    if (currentStep === steps.length - 1) {
      // Complete onboarding
      await completeOnboarding()
    } else {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const completeOnboarding = async () => {
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return

      // Save preferences
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('site_content') as any).upsert({
        key: 'user_preferences',
        value: {
          careerGoal,
          targetRole,
          currentYear,
          skills,
          interests: [],
          theme: 'system',
          emailNotifications: true,
          weeklyDigest: true,
          goalReminders: true,
          publicProfile: false,
          showGitHub: true,
          lastUpdated: new Date().toISOString(),
        },
        user_id: user.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key,user_id' })

      // Mark onboarding as completed
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('site_content') as any).upsert({
        key: 'onboarding_completed',
        value: true,
        user_id: user.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key,user_id' })

      setOpen(false)
    } catch (error) {
      console.error('Failed to complete onboarding:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleSkip = async () => {
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return

      // Mark onboarding as completed without saving preferences
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('site_content') as any).upsert({
        key: 'onboarding_completed',
        value: true,
        user_id: user.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key,user_id' })

      setOpen(false)
    } catch (error) {
      console.error('Failed to skip onboarding:', error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return null

  const progress = ((currentStep + 1) / steps.length) * 100
  const step = steps[currentStep]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg" onPointerDownOutside={(e) => e.preventDefault()}>
        {/* Progress */}
        <div className="absolute top-0 left-0 right-0 h-1">
          <Progress value={progress} className="h-1 rounded-none" />
        </div>

        {/* Skip button */}
        {currentStep < steps.length - 1 && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-3 right-10 text-muted-foreground"
            onClick={handleSkip}
            disabled={saving}
          >
            Skip
          </Button>
        )}

        <DialogHeader className="text-center pt-4">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
            {step.icon}
          </div>
          <DialogTitle className="text-xl">{step.title}</DialogTitle>
          <DialogDescription>{step.description}</DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Welcome Step */}
          {currentStep === 0 && (
            <div className="space-y-4 text-center">
              <p className="text-muted-foreground">
                Miller AI Group is your personal command center for career development,
                goal tracking, and productivity.
              </p>
              <div className="grid grid-cols-2 gap-3 mt-6">
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <Target className="w-5 h-5 mx-auto mb-2 text-amber-500" />
                  <p className="text-sm font-medium">Track Goals</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <Github className="w-5 h-5 mx-auto mb-2 text-amber-500" />
                  <p className="text-sm font-medium">GitHub Stats</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <Sparkles className="w-5 h-5 mx-auto mb-2 text-amber-500" />
                  <p className="text-sm font-medium">AI Insights</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <Briefcase className="w-5 h-5 mx-auto mb-2 text-amber-500" />
                  <p className="text-sm font-medium">Career Hub</p>
                </div>
              </div>
            </div>
          )}

          {/* Profile Step */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Current Year / Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {yearOptions.map((option) => (
                    <Button
                      key={option.value}
                      variant={currentYear === option.value ? 'default' : 'outline'}
                      size="sm"
                      className={cn(
                        'justify-start',
                        currentYear === option.value && 'bg-amber-500 hover:bg-amber-600'
                      )}
                      onClick={() => setCurrentYear(option.value)}
                    >
                      {currentYear === option.value && <Check className="w-4 h-4 mr-2" />}
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Target Role
                </label>
                <Input
                  placeholder="e.g., Software Engineer, Data Scientist"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Goals Step */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  What&apos;s your main career goal?
                </label>
                <Textarea
                  placeholder="e.g., Land a software engineering internship at a top tech company, transition into AI/ML..."
                  value={careerGoal}
                  onChange={(e) => setCareerGoal(e.target.value)}
                  rows={4}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                This helps personalize AI-powered insights and recommendations.
              </p>
            </div>
          )}

          {/* Skills Step */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Select your skills
                </label>
                <div className="flex flex-wrap gap-2 mb-4">
                  {suggestedSkills.map((skill) => (
                    <Button
                      key={skill}
                      variant={skills.includes(skill) ? 'default' : 'outline'}
                      size="sm"
                      className={cn(
                        'h-8',
                        skills.includes(skill) && 'bg-amber-500 hover:bg-amber-600'
                      )}
                      onClick={() =>
                        skills.includes(skill)
                          ? handleRemoveSkill(skill)
                          : handleAddSkill(skill)
                      }
                    >
                      {skill}
                      {skills.includes(skill) && <Check className="w-3 h-3 ml-1" />}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Add custom skills
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a skill..."
                    value={customSkill}
                    onChange={(e) => setCustomSkill(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddSkill(customSkill)
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    onClick={() => handleAddSkill(customSkill)}
                    disabled={!customSkill}
                  >
                    Add
                  </Button>
                </div>
              </div>
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  {skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="pl-2 pr-1">
                      {skill}
                      <button
                        onClick={() => handleRemoveSkill(skill)}
                        className="ml-1 p-0.5 hover:bg-muted rounded"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Complete Step */}
          {currentStep === 4 && (
            <div className="space-y-4 text-center">
              <div className="w-20 h-20 mx-auto rounded-full bg-green-500/10 flex items-center justify-center">
                <Check className="w-10 h-10 text-green-500" />
              </div>
              <p className="text-muted-foreground">
                Your personal hub is ready! Explore your dashboard, set goals,
                and leverage AI-powered insights for your career.
              </p>
              <div className="text-sm text-muted-foreground">
                <p>You can always update your preferences in Settings.</p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={currentStep === 0 || saving}
          >
            Back
          </Button>

          <div className="flex gap-1">
            {steps.map((_, i) => (
              <div
                key={i}
                className={cn(
                  'w-2 h-2 rounded-full transition-colors',
                  i === currentStep ? 'bg-amber-500' : 'bg-muted'
                )}
              />
            ))}
          </div>

          <Button
            onClick={handleNext}
            disabled={saving}
            className="bg-amber-500 hover:bg-amber-600"
          >
            {saving ? (
              'Saving...'
            ) : currentStep === steps.length - 1 ? (
              'Get Started'
            ) : (
              <>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
