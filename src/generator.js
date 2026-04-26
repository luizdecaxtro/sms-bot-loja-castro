// src/generator.js — gera posts de SMS via Claude API
import Anthropic from '@anthropic-ai/sdk'
import { getLastSentCategories, getCategories } from './db.js'
import { scrapeByCategory } from './scraper.js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MAX_SMS = parseInt(process.env.SMS_MAX_LENGTH || '160')

/**
 * Escolhe a próxima categoria a usar, evitando repetir as últimas 3.
 * Garante variedade no conteúdo enviado.
 */
export async function pickNextCategory() {
  const [allCategories, recentSlugs] = await Promise.all([
    getCategories(),
    getLastSentCategories(3)
  ])

  // Filtra categorias que não foram usadas recentemente
  const available = allCategories.filter(c => !recentSlugs.includes(c.slug))

  // Se todas foram usadas recentemente, usa qualquer uma (ciclo completo)
  const pool = available.length > 0 ? available : allCategories

  // Escolhe aleatoriamente dentro do pool disponível
  return pool[Math.floor(Math.random() * pool.length)]
}

/**
 * Gera um post SMS para uma categoria específica.
 * Faz scraping do site, escolhe um item aleatório e pede à IA para criar o texto.
 *
 * @param {Object} category - objeto da tabela categories { id, slug, label, emoji }
 * @returns {{ content, sourceUrl, sourceTitle }}
 */
export async function generatePost(category) {
  // 1. Busca conteúdo real do site
  const items = await scrapeByCategory(category.slug)
  const item  = items[Math.floor(Math.random() * items.length)]

  // 2. Monta o prompt para o Claude
  const systemPrompt = `Você é um especialista em marketing de conteúdo para a Loja de Castro,
uma plataforma brasileira de desenvolvimento pessoal, livros e mentorias.
Sua tarefa é criar mensagens SMS curtas, envolventes e que gerem desejo de clicar.

Regras obrigatórias:
- Máximo de ${MAX_SMS} caracteres no total (SMS padrão)
- Escreva em português brasileiro informal mas profissional
- Inclua sempre a URL fornecida no final
- Comece com o emoji da categoria
- Nunca use jargões ou clichês vazios
- Foque no benefício real para o leitor
- Não use asteriscos nem formatação markdown — apenas texto puro`

  const userPrompt = `Crie um SMS de divulgação para a seguinte oferta da Loja de Castro:

Categoria: ${category.emoji} ${category.label}
Título: ${item.title}
Descrição: ${item.description || 'Conteúdo transformador'}
URL: ${item.url}

Gere APENAS o texto do SMS, sem explicações adicionais.`

  // 3. Chama a API do Claude
  const response = await anthropic.messages.create({
    model:      'claude-opus-4-5',
    max_tokens: 300,
    messages:   [{ role: 'user', content: userPrompt }],
    system:     systemPrompt
  })

  const content = response.content[0].text.trim()

  // 4. Valida tamanho
  if (content.length > MAX_SMS) {
    console.warn(`⚠️  Post gerado tem ${content.length} chars (máx ${MAX_SMS}). Truncando...`)
  }

  return {
    content:      content.slice(0, MAX_SMS),
    sourceUrl:    item.url,
    sourceTitle:  item.title
  }
}

/**
 * Pipeline completo: escolhe categoria → scrape → gera post com IA.
 * Retorna o post salvo no banco (draft).
 */
export async function generateAndSave() {
  const { savePost } = await import('./db.js')

  console.log('🔍 Escolhendo categoria...')
  const category = await pickNextCategory()
  console.log(`📂 Categoria selecionada: ${category.emoji} ${category.label}`)

  console.log('🌐 Fazendo scraping do site...')
  const { content, sourceUrl, sourceTitle } = await generatePost(category)
  console.log(`✍️  Post gerado (${content.length} chars): ${content.slice(0, 60)}...`)

  const post = await savePost({
    categoryId:  category.id,
    sourceUrl,
    sourceTitle,
    content
  })

  console.log(`💾 Post salvo com ID: ${post.id}`)
  return { post, category }
}
