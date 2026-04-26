// src/cli.js — comandos manuais via terminal
// Uso: node src/cli.js [generate|send|contacts|preview]
import 'dotenv/config'
import { generateAndSave } from './generator.js'
import { sendCampaign }    from './sender.js'
import { getActiveContacts, upsertContact, getCategories } from './db.js'

const [,, command, ...args] = process.argv

const COMMANDS = {
  // Gera um post e já envia para todos os contatos
  async 'send'() {
    console.log('🚀 Gerando post e enviando SMS...\n')
    const { post } = await generateAndSave()
    const resumo = await sendCampaign(post)
    console.log('\n✅ Concluído!', resumo)
  },

  // Gera um post e salva como rascunho (sem enviar)
  async 'generate'() {
    console.log('✍️  Gerando post (apenas rascunho)...\n')
    const { post, category } = await generateAndSave()
    console.log('\n--- POST GERADO ---')
    console.log(`Categoria : ${category.label}`)
    console.log(`Título    : ${post.source_title}`)
    console.log(`Conteúdo  :\n${post.content}`)
    console.log(`Chars     : ${post.content.length}`)
    console.log(`ID        : ${post.id}`)
    console.log('------------------')
    console.log('\nPost salvo como rascunho. Use "send-post <id>" para enviar.')
  },

  // Lista contatos ativos
  async 'contacts'() {
    const contacts = await getActiveContacts()
    console.log(`\n📋 ${contacts.length} contatos ativos:\n`)
    contacts.forEach((c, i) => {
      console.log(`  ${String(i+1).padStart(3)}. ${c.name.padEnd(25)} ${c.phone}`)
    })
  },

  // Adiciona um contato via terminal
  // Uso: node src/cli.js add-contact "Nome" "+5521999990001"
  async 'add-contact'() {
    const [name, phone] = args
    if (!name || !phone) {
      console.error('Uso: node src/cli.js add-contact "Nome" "+5521999990001"')
      process.exit(1)
    }
    const contact = await upsertContact({ name, phone })
    console.log(`✅ Contato salvo:`, contact)
  },

  // Lista categorias disponíveis
  async 'categories'() {
    const cats = await getCategories()
    console.log('\n📂 Categorias:\n')
    cats.forEach(c => console.log(`  ${c.emoji} ${c.label.padEnd(20)} slug: ${c.slug}`))
  },

  // Preview de um post sem salvar nem enviar
  async 'preview'() {
    const { pickNextCategory, generatePost } = await import('./generator.js')
    const category = await pickNextCategory()
    console.log(`\n🔍 Categoria escolhida: ${category.emoji} ${category.label}\n`)
    const { content, sourceTitle, sourceUrl } = await generatePost(category)
    console.log('--- PREVIEW ---')
    console.log(`Título  : ${sourceTitle}`)
    console.log(`URL     : ${sourceUrl}`)
    console.log(`SMS     :\n${content}`)
    console.log(`Chars   : ${content.length}`)
    console.log('(não foi salvo nem enviado)')
  }
}

async function main() {
  if (!command || !COMMANDS[command]) {
    console.log(`
🤖 Loja de Castro — SMS Bot CLI

Comandos disponíveis:
  node src/cli.js generate       Gera post e salva como rascunho
  node src/cli.js send           Gera post e envia para todos os contatos
  node src/cli.js preview        Prévia do post sem salvar
  node src/cli.js contacts       Lista contatos ativos
  node src/cli.js categories     Lista categorias disponíveis
  node src/cli.js add-contact "Nome" "+5521999990001"
    `)
    process.exit(0)
  }

  try {
    await COMMANDS[command]()
  } catch (err) {
    console.error('\n❌ Erro:', err.message)
    process.exit(1)
  }
}

main()
