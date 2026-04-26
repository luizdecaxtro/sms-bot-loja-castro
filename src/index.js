// src/index.js — servidor Express + agendador automático (cron)
import 'dotenv/config'
import express    from 'express'
import cron       from 'node-cron'
import { generateAndSave } from './generator.js'
import { sendCampaign }    from './sender.js'
import {
  getActiveContacts,
  upsertContact,
  optOutContact,
  getCategories,
  supabase
} from './db.js'

const app  = express()
const PORT = process.env.PORT || 3000

app.use(express.json())
import { fileURLToPath } from 'url'
import { dirname } from 'path'
const __dirname = dirname(fileURLToPath(import.meta.url))
app.use(express.static(__dirname))

// ── Middleware de autenticação simples ────────────────────────
// Em produção substitua por JWT ou chave de API real
app.use((req, res, next) => {
  const key = req.headers['x-api-key']
  if (process.env.NODE_ENV === 'production' && key !== process.env.API_SECRET) {
    return res.status(401).json({ error: 'Não autorizado' })
  }
  next()
})

// ─────────────────────────────────────────────────────────────
//  ROTAS REST
// ─────────────────────────────────────────────────────────────

/** GET /health — status do servidor */
app.get('/health', (_, res) => res.json({ status: 'ok', time: new Date() }))

/** GET /contacts — lista contatos ativos */
app.get('/contacts', async (_, res) => {
  try {
    const contacts = await getActiveContacts()
    res.json({ total: contacts.length, contacts })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/** POST /contacts — adiciona um contato */
app.post('/contacts', async (req, res) => {
  try {
    const { name, phone, source } = req.body
    if (!name || !phone) return res.status(400).json({ error: 'name e phone são obrigatórios' })
    const contact = await upsertContact({ name, phone, source })
    res.status(201).json(contact)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/** DELETE /contacts/:phone — opt-out de um contato */
app.delete('/contacts/:phone', async (req, res) => {
  try {
    await optOutContact(decodeURIComponent(req.params.phone))
    res.json({ message: 'Contato marcado como opted_out' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/** GET /categories — lista categorias */
app.get('/categories', async (_, res) => {
  try {
    const cats = await getCategories()
    res.json(cats)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/** GET /posts — últimos posts gerados */
app.get('/posts', async (_, res) => {
  try {
    const { data, error } = await supabase
      .from('generated_posts')
      .select('*, categories(label, emoji)')
      .order('created_at', { ascending: false })
      .limit(20)
    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/** POST /generate — gera um post (rascunho, sem enviar) */
app.post('/generate', async (_, res) => {
  try {
    const result = await generateAndSave()
    res.json({
      message:  'Post gerado com sucesso',
      post:     result.post,
      category: result.category
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/** POST /send — gera post e envia para todos os contatos */
app.post('/send', async (_, res) => {
  try {
    console.log('📤 Envio manual iniciado via API')
    const { post } = await generateAndSave()
    const resumo   = await sendCampaign(post)
    res.json({ message: 'Campanha enviada', post, resumo })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/** POST /send/:postId — envia um rascunho específico */
app.post('/send/:postId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('generated_posts')
      .select('*')
      .eq('id', req.params.postId)
      .single()
    if (error || !data) return res.status(404).json({ error: 'Post não encontrado' })
    if (data.status === 'sent') return res.status(400).json({ error: 'Post já foi enviado' })

    const resumo = await sendCampaign(data)
    res.json({ message: 'Post enviado', resumo })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/** GET /campaigns — histórico de campanhas */
app.get('/campaigns', async (_, res) => {
  try {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*, generated_posts(source_title, content, categories(label, emoji))')
      .order('started_at', { ascending: false })
      .limit(20)
    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/** POST /webhook/twilio — atualiza status de entrega (webhook Twilio) */
app.post('/webhook/twilio', express.urlencoded({ extended: false }), async (req, res) => {
  const { MessageSid, MessageStatus, To } = req.body

  if (MessageSid && MessageStatus) {
    await supabase
      .from('sms_sends')
      .update({ status: MessageStatus })
      .eq('provider_msg_id', MessageSid)

    console.log(`🔔 Webhook Twilio: ${To} → ${MessageStatus}`)
  }

  res.status(204).send()
})

// ─────────────────────────────────────────────────────────────
//  AGENDADOR CRON
// ─────────────────────────────────────────────────────────────
const CRON = process.env.CRON_SCHEDULE || '0 9 * * 1,3,5' // seg/qua/sex às 9h

cron.schedule(CRON, async () => {
  console.log(`\n⏰ Cron disparado: ${new Date().toLocaleString('pt-BR')}`)
  try {
    const { post } = await generateAndSave()
    const resumo   = await sendCampaign(post)
    console.log('✅ Envio automático concluído:', resumo)
  } catch (err) {
    console.error('❌ Erro no envio automático:', err.message)
  }
}, { timezone: 'America/Sao_Paulo' })

// ─────────────────────────────────────────────────────────────
//  START
// ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
🤖 Loja de Castro — SMS Bot iniciado!
   Servidor : http://localhost:${PORT}
   Cron     : ${CRON} (America/Sao_Paulo)
   Ambiente : ${process.env.NODE_ENV || 'development'}

Endpoints disponíveis:
  GET  /health
  GET  /contacts        POST /contacts     DELETE /contacts/:phone
  GET  /categories
  GET  /posts
  POST /generate
  POST /send            POST /send/:postId
  GET  /campaigns
  POST /webhook/twilio
  `)
})
