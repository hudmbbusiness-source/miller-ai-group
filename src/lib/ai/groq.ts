import Groq from 'groq-sdk'
import { searchInternships, searchCompanyHiring, searchTechJobs, formatSearchResultsForAI, isWebSearchAvailable } from './web-search'

// Lazy-initialize Groq client to avoid build-time errors
let groqClient: Groq | null = null

function getGroqClient(): Groq {
  if (!groqClient) {
    if (!process.env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is not configured')
    }
    groqClient = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    })
  }
  return groqClient
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface CareerInsight {
  recommendation: string
  nextSteps: string[]
  marketTrends: string
  skillGaps: string[]
}

export interface ProgressAnalysis {
  summary: string
  strengths: string[]
  areasToImprove: string[]
  predictedOutcome: string
  motivationalMessage: string
}

// Get AI-powered career insights based on progress
export async function getCareerInsights(
  completedItems: string[],
  pendingItems: string[],
  careerGoal: string
): Promise<CareerInsight> {
  // Fetch real-time market data
  let webContext = ''
  if (isWebSearchAvailable()) {
    const jobSearch = await searchTechJobs()
    if (jobSearch.searchPerformed) {
      webContext = formatSearchResultsForAI(jobSearch)
    }
  }

  const prompt = `You are a career advisor for a computer science student at BYU pursuing AI/ML and entrepreneurship opportunities.
${webContext ? `\nYou have access to LIVE MARKET DATA. Use this to provide current, accurate career advice:\n${webContext}` : ''}

Current Progress:
- Completed: ${completedItems.join(', ') || 'None yet'}
- Pending: ${pendingItems.join(', ') || 'None'}
- Career Goal: ${careerGoal}

Based on current tech industry trends, provide:
1. A specific recommendation for their next focus area
2. 3-4 concrete next steps they should take this week
3. Relevant market trends in AI/ML hiring (use the web search data if available)
4. 2-3 skill gaps they should address

Respond in JSON format:
{
  "recommendation": "...",
  "nextSteps": ["...", "...", "..."],
  "marketTrends": "...",
  "skillGaps": ["...", "..."]
}`

  try {
    const completion = await getGroqClient().chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 1024,
      response_format: { type: 'json_object' },
    })

    const content = completion.choices[0]?.message?.content
    if (!content) throw new Error('No response from AI')

    return JSON.parse(content) as CareerInsight
  } catch (error) {
    console.error('AI Career Insights Error:', error)
    throw new Error('Failed to generate career insights. Please try again.')
  }
}

// Analyze overall progress and provide motivation
export async function analyzeProgress(
  totalItems: number,
  completedCount: number,
  recentActivity: string[]
): Promise<ProgressAnalysis> {
  const progressPercentage = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0

  const prompt = `You are an encouraging mentor for a student working on "The Zuckerberg Project" - a comprehensive plan to land top-tier AI internships.

Progress Stats:
- Overall: ${progressPercentage}% complete (${completedCount}/${totalItems} items)
- Recent Activity: ${recentActivity.slice(0, 5).join(', ') || 'No recent activity'}

Provide a brief, personalized analysis including:
1. A 1-2 sentence summary of their progress
2. 2-3 strengths based on what they've completed
3. 2-3 areas to improve
4. A predicted outcome if they maintain this pace
5. A short motivational message (1-2 sentences, be genuine not cheesy)

Respond in JSON format:
{
  "summary": "...",
  "strengths": ["...", "..."],
  "areasToImprove": ["...", "..."],
  "predictedOutcome": "...",
  "motivationalMessage": "..."
}`

  try {
    const completion = await getGroqClient().chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 800,
      response_format: { type: 'json_object' },
    })

    const content = completion.choices[0]?.message?.content
    if (!content) throw new Error('No response from AI')

    return JSON.parse(content) as ProgressAnalysis
  } catch (error) {
    console.error('AI Progress Analysis Error:', error)
    throw new Error('Failed to analyze progress. Please try again.')
  }
}

// Summarize notes using AI
export async function summarizeNote(noteContent: string): Promise<string> {
  if (!noteContent || noteContent.length < 50) {
    return noteContent
  }

  try {
    const completion = await getGroqClient().chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that creates concise summaries. Keep summaries under 100 words.',
        },
        {
          role: 'user',
          content: `Summarize this note:\n\n${noteContent}`,
        },
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.3,
      max_tokens: 200,
    })

    return completion.choices[0]?.message?.content || noteContent
  } catch (error) {
    console.error('AI Summarize Error:', error)
    return noteContent
  }
}

// Generate goal suggestions based on current goals
export async function suggestGoals(currentGoals: string[]): Promise<string[]> {
  const prompt = `Based on these existing goals for a Business student studying AI Software Engineering:
${currentGoals.map((g, i) => `${i + 1}. ${g}`).join('\n')}

Suggest 3 complementary goals that would help them succeed. Keep each goal concise (under 15 words).

Respond as a JSON array of strings: ["goal1", "goal2", "goal3"]`

  try {
    const completion = await getGroqClient().chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.1-8b-instant',
      temperature: 0.8,
      max_tokens: 200,
      response_format: { type: 'json_object' },
    })

    const content = completion.choices[0]?.message?.content
    if (!content) return []

    const parsed = JSON.parse(content)
    return Array.isArray(parsed) ? parsed : parsed.goals || parsed.suggestions || []
  } catch (error) {
    console.error('AI Goal Suggestions Error:', error)
    throw new Error('Failed to generate goal suggestions. Please try again.')
  }
}

// Get specific internship company recommendations
export interface CompanyRecommendation {
  name: string
  type: string
  roles: string[]
  applicationUrl: string
  deadline: string
  requirements: string[]
  whyApply: string
  matchScore: number
  salaryRange: {
    min: number
    max: number
    bonus?: string
  }
}

export async function getInternshipRecommendations(
  skills: string[],
  interests: string[],
  currentProgress: number
): Promise<CompanyRecommendation[]> {
  const result = await getInternshipRecommendationsWithWebSearch(skills, interests, currentProgress)
  return result.recommendations
}

// Enhanced internship recommendations with web search for current data
export async function getInternshipRecommendationsWithWebSearch(
  skills: string[],
  interests: string[],
  currentProgress: number
): Promise<{ recommendations: CompanyRecommendation[]; webSearchUsed: boolean }> {
  // Fetch real-time internship data via web search
  let webContext = ''
  let webSearchUsed = false

  if (isWebSearchAvailable()) {
    console.log('Fetching real-time internship data...')
    const [internshipSearch, googleSearch, anthropicSearch] = await Promise.all([
      searchInternships(),
      searchCompanyHiring('Google internship 2025'),
      searchCompanyHiring('Anthropic OpenAI internship 2025'),
    ])

    webSearchUsed = internshipSearch.searchPerformed || googleSearch.searchPerformed || anthropicSearch.searchPerformed

    if (internshipSearch.searchPerformed) {
      webContext += formatSearchResultsForAI(internshipSearch)
    }
    if (googleSearch.searchPerformed) {
      webContext += formatSearchResultsForAI(googleSearch)
    }
    if (anthropicSearch.searchPerformed) {
      webContext += formatSearchResultsForAI(anthropicSearch)
    }
  }

  const prompt = `You are a career advisor for a computer science student at BYU interested in AI/ML and entrepreneurship.
${webContext ? `\nYou have access to LIVE WEB SEARCH DATA about current internship opportunities. Use this real data to provide accurate, current recommendations:\n${webContext}` : ''}

Student Profile:
- Skills: ${skills.join(', ') || 'Python, JavaScript, basic ML'}
- Interests: ${interests.join(', ') || 'AI, startups, product development'}
- Project Completion: ${currentProgress}%

Provide exactly 10 specific companies they should apply to for Summer 2025 internships. Include a mix of:
- 3 FAANG companies
- 3 AI-focused companies (OpenAI, Anthropic, etc.)
- 2 high-growth startups
- 2 fintech/other tech companies

For each company, provide the ACTUAL application URL (use real URLs like careers.google.com, jobs.lever.co/anthropic, etc.).
Also include realistic INTERNSHIP salary data for Summer 2025 (based on current market data).

Respond in JSON format:
{
  "companies": [
    {
      "name": "Company Name",
      "type": "FAANG|AI Lab|Startup|Fintech",
      "roles": ["SWE Intern", "ML Intern"],
      "applicationUrl": "https://actual-careers-page.com/internships",
      "deadline": "January 2025",
      "requirements": ["Python", "Data Structures", "ML basics"],
      "whyApply": "Why this company is a good fit",
      "matchScore": 85,
      "salaryRange": {
        "min": 8000,
        "max": 12000,
        "bonus": "Housing stipend $2k-4k/month"
      }
    }
  ]
}`

  try {
    const completion = await getGroqClient().chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.5,
      max_tokens: 2048,
      response_format: { type: 'json_object' },
    })

    const content = completion.choices[0]?.message?.content
    if (!content) throw new Error('No response from AI')

    const parsed = JSON.parse(content)
    return {
      recommendations: (parsed.companies || []) as CompanyRecommendation[],
      webSearchUsed,
    }
  } catch (error) {
    console.error('AI Internship Recommendations Error:', error)
    throw new Error('Failed to generate internship recommendations. Please try again.')
  }
}

// Chat with AI assistant
export async function chat(messages: AIMessage[]): Promise<string> {
  try {
    const completion = await getGroqClient().chat.completions.create({
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 1024,
    })

    return completion.choices[0]?.message?.content || 'I apologize, I could not generate a response.'
  } catch (error) {
    console.error('AI Chat Error:', error)
    throw new Error('Failed to get AI response')
  }
}

// Transcribe audio to text using Groq's Whisper model
export async function transcribeAudio(audioFile: File): Promise<string> {
  try {
    const transcription = await getGroqClient().audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-large-v3-turbo',
      language: 'en',
      response_format: 'text',
    })

    return transcription as unknown as string
  } catch (error) {
    console.error('Audio Transcription Error:', error)
    throw new Error('Failed to transcribe audio')
  }
}

// Transcribe audio from buffer (for API routes)
export async function transcribeAudioBuffer(
  buffer: Buffer,
  filename: string = 'audio.webm'
): Promise<string> {
  try {
    // Create Blob from buffer, then File
    const blob = new Blob([buffer] as BlobPart[], { type: 'audio/webm' })
    const file = new File([blob], filename, { type: 'audio/webm' })

    const transcription = await getGroqClient().audio.transcriptions.create({
      file: file,
      model: 'whisper-large-v3-turbo',
      language: 'en',
      response_format: 'text',
    })

    return transcription as unknown as string
  } catch (error) {
    console.error('Audio Transcription Error:', error)
    throw new Error('Failed to transcribe audio')
  }
}
