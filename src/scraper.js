// src/scraper.js — conteúdo estático da Loja de Castro (sem scraping)
const BASE_URL = process.env.TARGET_SITE_URL || 'https://www.lojasdecastro.com.br'

export async function scrapeBooks() {
  return [
    { title: 'Coleção de Livros Transformadores', description: 'Curadoria de livros em desenvolvimento pessoal, liderança e espiritualidade.', url: `${BASE_URL}/livros` },
    { title: 'Livros de Desenvolvimento Pessoal', description: 'Os melhores títulos para transformar sua mentalidade e resultados.', url: `${BASE_URL}/livros` },
    { title: 'Biblioteca da Loja de Castro', description: 'Livros selecionados para quem quer evoluir de verdade.', url: `${BASE_URL}/livros` }
  ]
}

export async function scrapeMentorias() {
  return [
    { title: 'Mentoria Exclusiva', description: 'Programa de mentoria individual e em grupo com especialistas renomados.', url: `${BASE_URL}/mentoria` },
    { title: 'Mentoria para Resultados', description: 'Acelere seus resultados com acompanhamento personalizado.', url: `${BASE_URL}/mentoria` },
    { title: 'Programa de Mentoria', description: 'Transforme sua vida com orientação de quem já chegou lá.', url: `${BASE_URL}/mentoria` }
  ]
}

export async function scrapeEventos() {
  return [
    { title: 'Evento Gratuito', description: 'Participe dos nossos eventos gratuitos e expanda seu conhecimento.', url: `${BASE_URL}/eventos` },
    { title: 'Encontro ao Vivo', description: 'Conecte-se com especialistas e pessoas que querem crescer.', url: `${BASE_URL}/eventos` },
    { title: 'Workshop Online Gratuito', description: 'Aprenda na prática com nossos workshops ao vivo.', url: `${BASE_URL}/eventos` }
  ]
}

export async function scrapeArtigos() {
  return [
    { title: 'Blog', description: 'Artigos e reflexões para sua transformação pessoal e profissional.', url: `${BASE_URL}/blog` },
    { title: 'Artigos de Crescimento', description: 'Conteúdo gratuito para quem quer evoluir todo dia.', url: `${BASE_URL}/blog` },
    { title: 'Reflexões da Semana', description: 'Novos artigos toda semana para inspirar sua jornada.', url: `${BASE_URL}/blog` }
  ]
}

export async function scrapeMembros() {
  return [
    { title: 'Área de Membros', description: 'Acesso exclusivo a conteúdos, comunidade e muito mais.', url: `${BASE_URL}/membros` },
    { title: 'Comunidade Exclusiva', description: 'Faça parte de uma comunidade de pessoas que querem crescer.', url: `${BASE_URL}/membros` }
  ]
}

export async function scrapeCursos() {
  return [
    { title: 'Cursos Online', description: 'Aprenda no seu ritmo com certificado reconhecido.', url: `${BASE_URL}/cursos` },
    { title: 'Cursos de Desenvolvimento Pessoal', description: 'Conteúdo prático para transformar sua vida e carreira.', url: `${BASE_URL}/cursos` },
    { title: 'Treinamentos Online', description: 'Capacitação completa para quem quer resultados reais.', url: `${BASE_URL}/cursos` }
  ]
}

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
