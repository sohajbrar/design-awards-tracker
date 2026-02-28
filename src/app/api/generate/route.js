import { NextResponse } from 'next/server'

const LLAMA_API_KEY = process.env.LLAMA_API_KEY || 'LLM|2485278665220395|qfkTtzlukIpj9k7u2rZdiRn4YvI'

export async function POST(request) {
  try {
    const { award, userProfile, customPrompt } = await request.json()

    const systemPrompt = `You are an expert at writing compelling jury application submissions for design awards. 
Your task is to help the user craft personalized, professional responses for their jury application.

Award Details:
- Name: ${award.name}
- Category: ${award.category}
- Type: ${award.type}
- Description: ${award.description}

User Profile:
${userProfile?.name ? `- Name: ${userProfile.name}` : '- Name: Design Professional'}
${userProfile?.years ? `- Years of Experience: ${userProfile.years}` : '- Years of Experience: 10+'}
${userProfile?.expertise ? `- Expertise: ${userProfile.expertise}` : '- Expertise: Product Design, UX Design'}
${userProfile?.notableWork ? `- Notable Work: ${userProfile.notableWork}` : ''}

Guidelines:
1. Be specific and authentic - avoid generic statements
2. Highlight relevant experience that matches the award's focus
3. Show passion for design excellence and industry contribution
4. Keep responses concise but impactful (300-500 words)
5. Tailor the tone to match the prestige level of the award
6. Include specific examples and achievements where relevant
7. Format with clear sections using **bold** headers`

    const userPrompt = customPrompt || `Write a compelling ${award.type} application for ${award.name}. Include:
1. A professional greeting to the selection committee
2. A brief introduction about my design expertise relevant to ${award.category}
3. Why I'm qualified to ${award.type === 'judging' ? 'judge' : award.type === 'speaking' ? 'speak at' : 'participate in'} this award
4. What unique perspective I would bring
5. My commitment to design excellence and the industry
6. A professional closing`

    // Try multiple AI providers in order
    let content = null
    
    // Try Groq first (free, fast, supports Llama)
    try {
      const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GROQ_API_KEY || 'gsk_placeholder'}`,
        },
        body: JSON.stringify({
          model: 'llama-3.1-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 1500,
          temperature: 0.7,
        }),
      })

      if (groqResponse.ok) {
        const data = await groqResponse.json()
        content = data.choices?.[0]?.message?.content
      }
    } catch (e) {
      console.log('Groq failed:', e.message)
    }

    // Try Together AI
    if (!content) {
      try {
        const togetherResponse = await fetch('https://api.together.xyz/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.TOGETHER_API_KEY || LLAMA_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            max_tokens: 1500,
            temperature: 0.7,
          }),
        })

        if (togetherResponse.ok) {
          const data = await togetherResponse.json()
          content = data.choices?.[0]?.message?.content
        }
      } catch (e) {
        console.log('Together failed:', e.message)
      }
    }

    // Try OpenRouter
    if (!content) {
      try {
        const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY || LLAMA_API_KEY}`,
            'HTTP-Referer': 'https://design-awards-tracker.vercel.app',
          },
          body: JSON.stringify({
            model: 'meta-llama/llama-3.1-70b-instruct:free',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            max_tokens: 1500,
            temperature: 0.7,
          }),
        })

        if (openRouterResponse.ok) {
          const data = await openRouterResponse.json()
          content = data.choices?.[0]?.message?.content
        }
      } catch (e) {
        console.log('OpenRouter failed:', e.message)
      }
    }

    // Fallback to template if all APIs fail
    if (!content) {
      content = generateFallbackContent(award, userProfile)
    }

    return NextResponse.json({ 
      content,
      source: content ? 'ai' : 'fallback'
    })

  } catch (error) {
    console.error('Generation error:', error)
    return NextResponse.json({ 
      content: 'Failed to generate content. Please try again.',
      error: error.message
    }, { status: 500 })
  }
}

function generateFallbackContent(award, profile) {
  const name = profile?.name || 'Design Professional'
  const years = profile?.years || '10+'
  const expertise = profile?.expertise || 'product design, UX design, and design leadership'
  
  const templates = {
    'judging': `Dear ${award.name} Selection Committee,

I am writing to express my strong interest in serving as a juror for the ${award.name}.

**Professional Background**

With ${years} years of experience in ${expertise}, I have developed a comprehensive understanding of what constitutes exceptional ${award.category.toLowerCase()} work. Throughout my career, I have had the privilege of working on diverse projects that have honed my ability to evaluate design quality, innovation, and impact.

**Qualifications for Jury Service**

• Deep expertise in ${award.category.toLowerCase()} with hands-on experience across multiple industries
• Proven track record of providing constructive, insightful feedback to designers at all levels
• Strong understanding of current trends, emerging technologies, and best practices in our field
• Commitment to promoting diversity, inclusion, and fresh perspectives in design recognition

**Unique Perspective**

I believe exceptional ${award.category.toLowerCase()} transcends aesthetics—it must solve real problems, create meaningful experiences, and demonstrate thoughtful execution. I would bring this holistic evaluation framework to the jury, considering not only visual excellence but also innovation, usability, and societal impact.

**Commitment**

If selected, I am committed to:
• Thoroughly reviewing each submission with care and objectivity
• Contributing meaningfully to jury discussions and deliberations
• Upholding the integrity and prestige of the ${award.name}
• Providing valuable feedback that helps advance our industry

I would be honored to contribute my expertise to the ${award.name} jury and help recognize the outstanding work that pushes our field forward.

Thank you for considering my application.

Respectfully,
${name}`,

    'speaking': `Dear ${award.name} Program Committee,

I am excited to submit my proposal to speak at ${award.name}.

**Proposed Talk: The Evolution of ${award.category}—Insights from ${years} Years of Practice**

**Abstract**

In this engaging session, I will share practical insights drawn from ${years} years of experience in ${expertise}. Attendees will learn actionable strategies they can immediately apply to their work, backed by real-world case studies and honest reflections on both successes and failures.

**Key Takeaways**

• Practical frameworks for approaching ${award.category.toLowerCase()} challenges
• Lessons learned from high-stakes projects and how to apply them
• Emerging trends and how to prepare for the future of our field
• Interactive exercises to reinforce key concepts

**Why This Talk Matters Now**

Our industry is evolving rapidly, and practitioners need guidance grounded in real experience. This talk bridges the gap between theory and practice, offering attendees concrete tools they can use immediately.

**Speaker Background**

${name} brings ${years} years of hands-on experience in ${expertise}. My work has impacted millions of users, and I am passionate about sharing knowledge to help elevate our entire community.

I would be thrilled to contribute to ${award.name} and engage with fellow practitioners.

Best regards,
${name}`,

    'event': `Dear ${award.name} Team,

I am writing to express my interest in participating in ${award.name}.

With ${years} years of experience in ${expertise}, I am eager to contribute to and learn from this event. I am particularly drawn to ${award.name} because of its focus on ${award.category.toLowerCase()} and its reputation for bringing together thoughtful practitioners.

**What I Hope to Contribute**

• Active participation in discussions and workshops
• Sharing insights from my experience in ${expertise}
• Connecting with fellow professionals to foster collaboration

**What I Hope to Gain**

• Fresh perspectives on ${award.category.toLowerCase()} challenges
• Connections with like-minded practitioners
• Inspiration for future projects

I look forward to the opportunity to be part of the ${award.name} community.

Best regards,
${name}`
  }

  return templates[award.type] || templates['judging']
}
