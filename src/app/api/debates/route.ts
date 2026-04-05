import { NextRequest } from 'next/server'
import Groq from 'groq-sdk'
import { createServerSupabase } from '@/lib/supabase'
import { generateUniqueSlug } from '@/lib/slugify'
import { checkRateLimit } from '@/lib/redis'
import { getAuth } from '@clerk/nextjs/server'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// GET /api/debates?slug=...  —  fetch a debate by slug
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')

    if (!slug) {
      return Response.json({ error: 'slug is required' }, { status: 400 })
    }

    const supabase = createServerSupabase()
    const { data: debate, error } = await supabase
      .from('debates')
      .select('*')
      .eq('slug', slug)
      .maybeSingle()

    if (error) {
      return Response.json({ error: 'Database error' }, { status: 500 })
    }
    if (!debate) {
      return Response.json({ error: 'Debate not found' }, { status: 404 })
    }

    return Response.json(debate)
  } catch {
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/debates  —  validate topic, deduplicate, create debate row
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { topic: string }
    let { topic } = body

    // Normalize
    topic = topic.trim().slice(0, 200)
    if (!topic) {
      return Response.json({ error: 'Topic is required' }, { status: 400 })
    }
    topic = topic.charAt(0).toUpperCase() + topic.slice(1)

    // Rate limit — anonymous by hashed IP, authenticated by Clerk user ID
    const { userId } = getAuth(request)
    const rawIp =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
      request.headers.get('x-real-ip') ??
      'unknown'
    const ipHash = await sha256(rawIp)
    const identifier = userId ?? `anon:${ipHash}`
    const isAuthenticated = !!userId

    const { allowed } = await checkRateLimit(identifier, isAuthenticated)
    if (!allowed) {
      return Response.json(
        { error: "You've used all your debates today. Sign in for more.", rateLimitExceeded: true },
        { status: 429 }
      )
    }

    const supabase = createServerSupabase()

    // Deduplication — SHA-256 of normalised lowercase topic
    const topicHash = await sha256(topic.toLowerCase())
    const { data: existing } = await supabase
      .from('debates')
      .select('id, slug, status')
      .eq('topic_hash', topicHash)
      .eq('status', 'done')
      .maybeSingle()

    if (existing) {
      return Response.json({ debateId: existing.id, slug: existing.slug, isExisting: true })
    }

    // Topic validation — fast small model, only runs for genuinely new topics
    const validation = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'user',
          content: `Is "${topic}" a debatable topic suitable for a debate platform? Reply only YES or NO.`,
        },
      ],
      max_tokens: 5,
    })
    const answer = validation.choices[0]?.message?.content?.trim().toUpperCase()
    if (answer !== 'YES') {
      return Response.json({ error: 'Please enter a debatable topic' }, { status: 400 })
    }

    // Generate a unique URL slug
    const slug = await generateUniqueSlug(topic, async (s) => {
      const { data } = await supabase
        .from('debates')
        .select('id')
        .eq('slug', s)
        .maybeSingle()
      return !!data
    })

    // Persist debate row
    const { data: newDebate, error: createError } = await supabase
      .from('debates')
      .insert({ topic, slug, topic_hash: topicHash, status: 'pending' })
      .select('id, slug')
      .single()

    if (createError || !newDebate) {
      return Response.json({ error: 'Failed to create debate' }, { status: 500 })
    }

    return Response.json({ debateId: newDebate.id, slug: newDebate.slug, isExisting: false })
  } catch {
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
