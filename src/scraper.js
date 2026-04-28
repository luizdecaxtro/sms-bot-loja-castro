// src/scraper.js — extrai conteúdo do site Loja de Castro
import axios from 'axios'
import * as cheerio from 'cheerio'

const BASE_URL = process.env.TARGET_SITE_URL || 'https://www.lojasdecastro.com.br'

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; LojaCastroBot/1.0)',
  'Accept-Language': 'pt-BR,pt;q=0.9'
}

/** Faz GET e retorna um objeto cheerio carregado */
async function fetchPage(url) {
  const { data } = await axios.get(url, { headers: HEADERS, timeout: 5000 })
  return cheerio.load(data)
}

// ─────────────────────────────────────────────────────────────
//  SCRAPERS POR CATEGORIA
//  Cada função retorna um array de { title, description, url }
// ─────────────────────────────────────────────────────────────

/** Livros disponíveis na loja */
export async function scrapeBooks() {
  try {
    const $ = await fetchPage(`${BASE_URL}/livros`)
    const items = []

    // Adapte os seletores conforme o HTML real do site
    $('article, .product-item, .livro-card, [class*="book"], [class*="livro"]').each((_, el) => {
      const title       = $(el).find('h2, h3, .title, .nome').first().text().trim()
      const description = $(el).find('p, .descricao, .resumo').first().text().trim()
      const href        = $(el).find('a').first().attr('href')
      const url         = href ? (href.startsWith('http') ? href : `${BASE_URL}${href}`) : BASE_URL

      if (title) items.push({ title, description, url })
    })

    // Fallback genérico se seletores não encontrarem nada
    if (items.length === 0) {
      items.push({
        title: 'Coleção de Livros',
        description: 'Curadoria de livros transformadores em desenvolvimento pessoal, liderança e espiritualidade.',
        url: `${BASE_URL}/livros`
      })
    }

    return items
  } catch (err) {
    console.warn('scrapeBooks falhou, usando fallback:', err.message)
    return [{ title: 'Livros', description: 'Confira nossa coleção.', url: `${BASE_URL}/livros` }]
  }
}

/** Mentorias oferecidas */
export async function scrapeMentorias() {
  try {
    const $ = await fetchPage(`${BASE_URL}/mentoria`)
    const items = []

    $('[class*="mentoria"], [class*="program"], section').each((_, el) => {
      const title       = $(el).find('h1, h2, h3').first().text().trim()
      const description = $(el).find('p').first().text().trim()
      const href        = $(el).find('a').first().attr('href')
      const url         = href ? (href.startsWith('http') ? href : `${BASE_URL}${href}`) : `${BASE_URL}/mentoria`

      if (title && title.length > 3) items.push({ title, description, url })
    })

    if (items.length === 0) {
      items.push({
        title: 'Mentoria Exclusiva',
        description: 'Programa de mentoria individual e em grupo com especialistas renomados.',
        url: `${BASE_URL}/mentoria`
      })
    }

    return items
  } catch (err) {
    console.warn('scrapeMentorias falhou, usando fallback:', err.message)
    return [{ title: 'Mentoria', description: 'Transforme seus resultados.', url: `${BASE_URL}/mentoria` }]
  }
}

/** Eventos gratuitos */
export async function scrapeEventos() {
  try {
    const $ = await fetchPage(`${BASE_URL}/eventos`)
    const items = []

    $('[class*="evento"], [class*="event"], article').each((_, el) => {
      const title       = $(el).find('h2, h3, .titulo').first().text().trim()
      const description = $(el).find('p, .descricao').first().text().trim()
      const date        = $(el).find('time, .data, [class*="date"]').first().text().trim()
      const href        = $(el).find('a').first().attr('href')
      const url         = href ? (href.startsWith('http') ? href : `${BASE_URL}${href}`) : `${BASE_URL}/eventos`

      if (title) items.push({ title, description: `${date ? date + ' — ' : ''}${description}`, url })
    })

    if (items.length === 0) {
      items.push({
        title: 'Evento Gratuito',
        description: 'Participe dos nossos eventos gratuitos e expanda seu conhecimento.',
        url: `${BASE_URL}/eventos`
      })
    }

    return items
  } catch (err) {
    console.warn('scrapeEventos falhou, usando fallback:', err.message)
    return [{ title: 'Eventos', description: 'Confira nossa agenda.', url: `${BASE_URL}/eventos` }]
  }
}

/** Artigos do blog */
export async function scrapeArtigos() {
  try {
    const $ = await fetchPage(`${BASE_URL}/blog`)
    const items = []

    $('article, .post, [class*="artigo"], [class*="blog-post"]').each((_, el) => {
      const title       = $(el).find('h2, h3, .titulo').first().text().trim()
      const description = $(el).find('p, .excerpt, .resumo').first().text().trim()
      const href        = $(el).find('a').first().attr('href')
      const url         = href ? (href.startsWith('http') ? href : `${BASE_URL}${href}`) : `${BASE_URL}/blog`

      if (title) items.push({ title, description, url })
    })

    if (items.length === 0) {
      items.push({
        title: 'Artigos e Reflexões',
        description: 'Conteúdo gratuito para sua transformação pessoal e profissional.',
        url: `${BASE_URL}/blog`
      })
    }

    return items.slice(0, 5) // máximo 5 artigos mais recentes
  } catch (err) {
    console.warn('scrapeArtigos falhou, usando fallback:', err.message)
    return [{ title: 'Blog', description: 'Leia nossos artigos.', url: `${BASE_URL}/blog` }]
  }
}

/** Área de membros */
export async function scrapeMembros() {
  try {
    const $ = await fetchPage(`${BASE_URL}/membros`)
    const title       = $('h1, h2').first().text().trim() || 'Área de Membros'
    const description = $('p').first().text().trim() || 'Acesso exclusivo a conteúdos, comunidade e muito mais.'
    return [{ title, description, url: `${BASE_URL}/membros` }]
  } catch (err) {
    return [{ title: 'Área de Membros', description: 'Conteúdo exclusivo para membros.', url: `${BASE_URL}/membros` }]
  }
}

/** Cursos disponíveis */
export async function scrapeCursos() {
  try {
    const $ = await fetchPage(`${BASE_URL}/cursos`)
    const items = []

    $('[class*="curso"], [class*="course"], article').each((_, el) => {
      const title       = $(el).find('h2, h3').first().text().trim()
      const description = $(el).find('p').first().text().trim()
      const href        = $(el).find('a').first().attr('href')
      const url         = href ? (href.startsWith('http') ? href : `${BASE_URL}${href}`) : `${BASE_URL}/cursos`
      if (title) items.push({ title, description, url })
    })

    if (items.length === 0) {
      items.push({ title: 'Cursos Online', description: 'Aprenda no seu ritmo com certificado.', url: `${BASE_URL}/cursos` })
    }
    return items
  } catch (err) {
    return [{ title: 'Cursos', description: 'Confira nossos cursos.', url: `${BASE_URL}/cursos` }]
  }
}

// ─────────────────────────────────────────────────────────────
//  DISPATCHER — chama o scraper certo pelo slug da categoria
// ─────────────────────────────────────────────────────────────
export async function scrapeByCategory(slug) {
  const map = {
    livro:    scrapeBooks,
    mentoria: scrapeMentorias,
    evento:   scrapeEventos,
    artigo:   scrapeArtigos,
    membros:  scrapeMembros,
    curso:    scrapeCursos
  }

  const fn = map[slug]
  if (!fn) throw new Error(`Categoria desconhecida: ${slug}`)
  return fn()
}
