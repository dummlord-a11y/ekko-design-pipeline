import Anthropic from '@anthropic-ai/sdk'
import { getSupabaseAdmin } from './supabase-admin.js'

async function getAnthropicClient() {
  const supabase = getSupabaseAdmin()
  const { data } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'anthropic_api_key')
    .single()

  const apiKey = data?.value || process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('Anthropic API key not configured. Go to Settings.')

  return new Anthropic({ apiKey })
}

interface AnalysisInput {
  subject: string
  body: string
  attachmentNames: string[]
}

export interface AnalysisResult {
  complexity: number
  category: string
  summary_uk: string
  complexity_reasoning: string
  estimated_hours: number
  key_requirements: string[]
}

const SYSTEM_PROMPT = `Ти — досвідчений менеджер поліграфічного виробництва та дизайн-студії.
Аналізуй вхідні запити на дизайн від клієнтів та оцінюй складність реалізації.

Шкала складності:
1 — Простий: перевидрук, зміна тексту, невеликі правки
2 — Легкий: оновлення кольору, тексту, заміна фото
3 — Середній: новий дизайн за шаблоном, декілька елементів
4 — Складний: новий дизайн з нуля, висічки, спеціальні покриття
5 — Дуже складний: повний брендинг, мульти-SKU система етикеток

Категорії: label_design, packaging, sticker, banner, brochure, other

Відповідай ТІЛЬКИ валідним JSON об'єктом без markdown форматування.`

const USER_PROMPT = (input: AnalysisInput) => `Проаналізуй запит на дизайн:

Тема: ${input.subject}

Зміст листа:
${input.body.slice(0, 3000)}

Вкладення: ${input.attachmentNames.length > 0 ? input.attachmentNames.join(', ') : 'Немає'}

Поверни JSON:
{
  "complexity": <число 1-5>,
  "category": "<одна з: label_design, packaging, sticker, banner, brochure, other>",
  "summary_uk": "<короткий опис завдання українською, 1-2 речення>",
  "complexity_reasoning": "<чому така оцінка складності>",
  "estimated_hours": <число>,
  "key_requirements": ["вимога 1", "вимога 2"]
}`

export async function analyzeEmail(input: AnalysisInput): Promise<AnalysisResult> {
  try {
    const client = await getAnthropicClient()
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: USER_PROMPT(input),
        },
      ],
    })

    const text =
      response.content[0].type === 'text' ? response.content[0].text : ''

    // Parse JSON from response (handle potential markdown wrapping)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }

    const result = JSON.parse(jsonMatch[0]) as AnalysisResult

    // Validate & clamp
    result.complexity = Math.max(1, Math.min(5, Math.round(result.complexity)))
    const validCategories = [
      'label_design', 'packaging', 'sticker', 'banner', 'brochure', 'other',
    ]
    if (!validCategories.includes(result.category)) {
      result.category = 'other'
    }

    return result
  } catch (error) {
    console.error('Claude analysis failed:', error)
    return {
      complexity: 3,
      category: 'other',
      summary_uk: 'AI аналіз очікує повторної обробки',
      complexity_reasoning: 'Автоматичний аналіз не вдався, потрібна повторна обробка',
      estimated_hours: 0,
      key_requirements: [],
    }
  }
}
