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

export interface AnalysisInput {
  subject: string
  body: string
  attachmentNames: string[]
  /** Base64-encoded images for visual analysis (JPEG/PNG) */
  images?: Array<{ data: string; mediaType: string }>
}

export interface AnalysisResult {
  complexity: number
  priority: 'critical' | 'high' | 'medium' | 'low'
  category: string
  summary_uk: string
  complexity_reasoning: string
  estimated_hours: number
  key_requirements: string[]
  technical_notes: string[]
  prepress_checklist: string[]
}

const SYSTEM_PROMPT = `Ти — експерт з цифрового дизайну та друку самоклейних етикеток з 15+ роками досвіду у флексографічному та цифровому друці. Ти працюєш як AI-менеджер дизайн-студії поліграфічного підприємства.

## ТВОЯ ЕКСПЕРТИЗА

### Матеріали та підкладки
- Самоклейні матеріали: напівглянець, глянець, матовий, металізований, прозора плівка (PP, PE, PET), термоетикетки (ЕКО, ТОП), синтетичні (Yupo, Tyvek)
- Клеї: перманентний, знімний, глибоко заморожений, агресивний для складних поверхонь
- Лайнери: глассін, крафт, PET-лайнер

### Технології друку
- Цифровий друк (HP Indigo, Xeikon, тонерний): CMYK + білий, невеликі тиражі, персоналізація
- Флексографічний друк: Pantone/спотові кольори, великі тиражі
- Комбінований друк: офсет + флексо, цифра + фінішинг
- УФ-друк: для стійкості до хімії, вологи, УФ-випромінювання

### Фінішинг та постдрук
- Ламінація: матова, глянцева, soft-touch, структурна
- Лакування: УФ-лак суцільний, вибірковий УФ-лак (spot UV), друковий лак
- Тиснення: гаряче фольгування (золото, срібло, голографічне), конгрев, блінтове тиснення
- Висічка: стандартна (прямокутна, кругла, овальна), фігурна (нестандартна форма, контурна)
- Нумерація, штрих-кодування, персоналізація даних

### Типи етикеток
- Продуктова етикетка (лицьова + контретикетка)
- Етикетка-бірка (fold-out, буклет-етикетка)
- Банд-етикетка (sleeve, shrink-sleeve)
- Промо-етикетка (пілінг, scratch-off)
- Технічна етикетка (GHS, хімічна безпека)
- Фармацевтична етикетка (вимоги регуляторів)
- Алкогольна продукція (акцизні вимоги, контретикетка, медальйон)

### Допечатна підготовка (prepress)
- Кольорові профілі: ISO Coated v2, FOGRA39, GRACoL
- Треппінг, оверпринт, кольороподіл
- Вимоги до висічного штампу (die-line): вилет (bleed) 2-3мм, безпечна зона
- Робота з кривими, растровими зображеннями (мін. 300 dpi)
- Підготовка файлів: AI, PDF/X-4, CDR → перевірка шрифтів, лінковані зображення

## ШКАЛА СКЛАДНОСТІ (1-5)

### 1 — Мінімальна (1-2 год роботи дизайнера)
- Зміна тексту/дати на існуючому макеті
- Заміна штрих-коду або інформації про виробника
- Адаптація існуючого макету під інший розмір (без зміни дизайну)
- Перевидрук без змін

### 2 — Низька (2-4 год)
- Оновлення існуючого дизайну: зміна кольору, шрифту, додавання елементу
- Заміна фотографій у готовому макеті
- Створення контретикетки на базі лицьової
- Адаптація під інший SKU (зміна назви, складу, ваги)
- Локалізація тексту (переклад на іншу мову в готовий макет)

### 3 — Середня (4-8 год)
- Новий дизайн за наданим прикладом/брендбуком
- Дизайн з декількома елементами: фото, ілюстрації, іконки, таблиці складу
- Етикетка з вибірковим лаком або фольгуванням (потрібна окрема форма)
- Розробка серії з 2-3 SKU в одному стилі
- Буклет-етикетка (fold-out) з простою конструкцією

### 4 — Висока (8-16 год)
- Повністю новий дизайн без прикладу (з нуля, тільки бриф)
- Складна фігурна висічка (нестандартна форма, потрібна розробка штампу)
- Дизайн з ілюстраціями/іконографікою на замовлення
- Етикетка з кількома видами фінішингу (фольга + вибірковий лак + тиснення)
- Shrink-sleeve або band-етикетка (потрібна розгортка)
- Серія 4-8 SKU з унікальними елементами на кожному
- Фармацевтична або GHS етикетка (регуляторні вимоги)

### 5 — Максимальна (16-40+ год)
- Повний ребрендинг лінійки продукції (10+ SKU)
- Розробка бренд-айдентики з нуля + застосування на етикетках
- Складні конструкції: буклет + shrink-sleeve + промо-механіка
- Преміальний дизайн з кастомними ілюстраціями та каліграфією
- Мульти-мовна етикетка (5+ мов) з адаптацією верстки
- Повний цикл: від концепту до друкарських файлів з кількома раундами правок

## ПРІОРИТЕТНІСТЬ

- **critical** — терміново (дедлайн сьогодні-завтра, зупинка виробництва, перевидрук через брак)
- **high** — важливо (дедлайн цього тижня, новий клієнт, запуск продукту)
- **medium** — стандартно (є час на опрацювання, типове завдання)
- **low** — не терміново (попередній запит, "колись", немає конкретного дедлайну)

Визначай пріоритет за ключовими словами: "терміново", "ASAP", "urgent", "до завтра", "зупинка лінії", "запуск", "launch" → підвищуй пріоритет.

## АНАЛІЗ ЗОБРАЖЕНЬ

Коли отримуєш зображення (фото існуючих етикеток, макети, референси):
- Оціни рівень деталізації та якість дизайну
- Визнач скільки кольорів (CMYK чи спот), чи є фольга/тиснення/вибірковий лак
- Оціни складність ілюстрацій та типографіки
- Визнач тип висічки (стандартна чи фігурна)
- Зверни увагу на конструкцію (проста етикетка, буклет, sleeve)
- Перевір чи є елементи що потребують окремих форм (spot UV, фольга)

## ФОРМАТ ВІДПОВІДІ

Відповідай ТІЛЬКИ валідним JSON об'єктом без markdown форматування.`

const USER_PROMPT = (input: AnalysisInput) => `Проаналізуй запит клієнта на дизайн етикетки/поліграфії:

ТЕМА ЛИСТА: ${input.subject}

ЗМІСТ ЛИСТА:
${input.body.slice(0, 5000)}

ВКЛАДЕНІ ФАЙЛИ: ${input.attachmentNames.length > 0 ? input.attachmentNames.join(', ') : 'Немає'}
${analyzeAttachmentNames(input.attachmentNames)}

На основі всієї доступної інформації (текст, назви файлів${input.images && input.images.length > 0 ? ', додані зображення' : ''}) поверни JSON:

{
  "complexity": <число 1-5 за шкалою вище>,
  "priority": "<critical | high | medium | low>",
  "category": "<label_design | packaging | sticker | banner | brochure | other>",
  "summary_uk": "<стислий опис завдання українською, 2-3 речення, включаючи тип етикетки, орієнтовний розмір, кількість SKU>",
  "complexity_reasoning": "<детальне пояснення оцінки: які саме фактори впливають на складність — тип дизайну, фінішинг, кількість SKU, конструкція, наявність ілюстрацій тощо>",
  "estimated_hours": <реалістична оцінка годин роботи дизайнера>,
  "key_requirements": ["конкретна вимога 1", "вимога 2", "..."],
  "technical_notes": ["технічне зауваження для дизайнера: роздільність, кольоровий простір, формат файлу, висічка тощо"],
  "prepress_checklist": ["що потрібно перевірити/підготувати перед друком"]
}`

function analyzeAttachmentNames(names: string[]): string {
  if (names.length === 0) return ''

  const hints: string[] = []
  const lower = names.map(n => n.toLowerCase())

  const hasImages = lower.some(n => /\.(jpg|jpeg|png|tiff?|bmp|webp)$/i.test(n))
  const hasPdf = lower.some(n => n.endsWith('.pdf'))
  const hasVector = lower.some(n => /\.(ai|eps|svg|cdr)$/i.test(n))
  const hasOffice = lower.some(n => /\.(docx?|xlsx?|pptx?)$/i.test(n))

  if (hasImages) hints.push('Є растрові зображення — можливо референси або фото продукту')
  if (hasPdf) hints.push('Є PDF файли — можливо існуючі макети або ТЗ')
  if (hasVector) hints.push('Є векторні файли — можливо готові елементи дизайну або логотипи')
  if (hasOffice) hints.push('Є офісні документи — можливо ТЗ, таблиці складу або тексти')

  const multiSku = names.filter(n => /sku|артикул|варіант|variant|flavor/i.test(n))
  if (multiSku.length > 0) hints.push(`Файли вказують на мульти-SKU завдання (${multiSku.length} варіантів)`)

  if (names.length > 5) hints.push(`Велика кількість вкладень (${names.length}) — можливо складне завдання з багатьма елементами`)

  return hints.length > 0 ? '\nАНАЛІЗ ВКЛАДЕНЬ: ' + hints.join('. ') : ''
}

/**
 * Quick relevance check — determines if an email is actually a design request.
 * Returns null if irrelevant, or the full analysis if relevant.
 */
export async function checkRelevanceAndAnalyze(input: AnalysisInput): Promise<AnalysisResult | null> {
  try {
    const client = await getAnthropicClient()

    const relevancePrompt = `Визнач чи цей лист є запитом на поліграфічний дизайн, друк етикеток, упаковку або суміжну роботу.

ТЕМА: ${input.subject}
ЗМІСТ (перші 800 символів): ${input.body.slice(0, 800)}
ВКЛАДЕННЯ: ${input.attachmentNames.join(', ') || 'Немає'}

НЕ є запитом на дизайн:
- Рекламні розсилки, спам, newsletters
- Рахунки, акти, бухгалтерія (якщо не стосуються замовлення дизайну)
- Внутрішня переписка що не містить завдання
- Автоматичні повідомлення (системні нотифікації, підтвердження реєстрації)
- Листи з результатами вже виконаної роботи (без нового завдання)
- Запити на ціну без конкретного завдання на дизайн

Є запитом на дизайн:
- Запит на розробку нового макету/етикетки/упаковки
- Запит на внесення змін до існуючого макету
- Запит на перевидрук з правками
- Лист з референсами, ТЗ, брифом на дизайн
- Запит на адаптацію дизайну під нові SKU
- Запит на допечатну підготовку

Відповідай ТІЛЬКИ одним словом: DESIGN або SKIP`

    const response = await client.messages.create({
      model: 'claude-haiku-3-5-20241022',
      max_tokens: 10,
      messages: [{ role: 'user', content: relevancePrompt }],
    })

    const verdict = response.content[0].type === 'text' ? response.content[0].text.trim().toUpperCase() : ''

    if (verdict.includes('SKIP')) {
      console.log(`[Relevance] Skipping non-design email: "${input.subject}"`)
      return null
    }

    // It's relevant — proceed with full analysis
    return analyzeEmail(input)
  } catch (error) {
    console.error('Relevance check failed, proceeding with analysis:', error)
    return analyzeEmail(input)
  }
}

export async function analyzeEmail(input: AnalysisInput): Promise<AnalysisResult> {
  try {
    const client = await getAnthropicClient()

    // Build message content — text + optional images
    const content: Anthropic.Messages.ContentBlockParam[] = []

    // Add images first (up to 3, max ~4MB each)
    if (input.images && input.images.length > 0) {
      const imagesToSend = input.images.slice(0, 3)
      for (const img of imagesToSend) {
        content.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: img.mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
            data: img.data,
          },
        })
      }
    }

    // Add text prompt
    content.push({
      type: 'text',
      text: USER_PROMPT(input),
    })

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content }],
    })

    const text =
      response.content[0].type === 'text' ? response.content[0].text : ''

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
    const validPriorities = ['critical', 'high', 'medium', 'low']
    if (!validPriorities.includes(result.priority)) {
      result.priority = 'medium'
    }
    if (!result.technical_notes) result.technical_notes = []
    if (!result.prepress_checklist) result.prepress_checklist = []

    return result
  } catch (error) {
    console.error('Claude analysis failed:', error)
    return {
      complexity: 3,
      priority: 'medium',
      category: 'other',
      summary_uk: 'AI аналіз очікує повторної обробки',
      complexity_reasoning: 'Автоматичний аналіз не вдався, потрібна повторна обробка',
      estimated_hours: 0,
      key_requirements: [],
      technical_notes: [],
      prepress_checklist: [],
    }
  }
}
