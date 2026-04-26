// src/db.js — cliente Supabase reutilizável
import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  throw new Error('Configure SUPABASE_URL e SUPABASE_SERVICE_KEY no .env')
}

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// ── Helpers de contatos ────────────────────────────────────────

/** Retorna todos os contatos ativos */
export async function getActiveContacts() {
  const { data, error } = await supabase
    .from('contacts')
    .select('id, name, phone')
    .eq('status', 'active')
    .order('name')

  if (error) throw new Error(`Erro ao buscar contatos: ${error.message}`)
  return data
}

/** Adiciona um contato (ou ignora se telefone já existir) */
export async function upsertContact({ name, phone, source = 'manual' }) {
  const { data, error } = await supabase
    .from('contacts')
    .upsert({ name, phone, source }, { onConflict: 'phone', ignoreDuplicates: true })
    .select()

  if (error) throw new Error(`Erro ao salvar contato: ${error.message}`)
  return data[0]
}

/** Marca contato como opted_out (não receberá mais SMS) */
export async function optOutContact(phone) {
  const { error } = await supabase
    .from('contacts')
    .update({ status: 'opted_out' })
    .eq('phone', phone)

  if (error) throw new Error(`Erro ao fazer opt-out: ${error.message}`)
}

// ── Helpers de posts ───────────────────────────────────────────

/** Salva um post gerado com status 'draft' */
export async function savePost({ categoryId, sourceUrl, sourceTitle, content }) {
  const { data, error } = await supabase
    .from('generated_posts')
    .insert({ category_id: categoryId, source_url: sourceUrl, source_title: sourceTitle, content })
    .select()

  if (error) throw new Error(`Erro ao salvar post: ${error.message}`)
  return data[0]
}

/** Retorna o slug da última categoria enviada (para evitar repetição) */
export async function getLastSentCategories(limit = 3) {
  const { data, error } = await supabase
    .from('generated_posts')
    .select('categories(slug)')
    .eq('status', 'sent')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`Erro ao buscar histórico: ${error.message}`)
  return data.map(r => r.categories?.slug).filter(Boolean)
}

/** Busca todas as categorias ativas */
export async function getCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('active', true)

  if (error) throw new Error(`Erro ao buscar categorias: ${error.message}`)
  return data
}

/** Atualiza o status de um post */
export async function updatePostStatus(postId, status) {
  const { error } = await supabase
    .from('generated_posts')
    .update({ status })
    .eq('id', postId)

  if (error) throw new Error(`Erro ao atualizar post: ${error.message}`)
}

// ── Helpers de envio ───────────────────────────────────────────

/** Registra um envio de SMS no log */
export async function logSmsSend({ postId, contactId, phone, provider, providerMsgId, status, errorMessage }) {
  const { error } = await supabase
    .from('sms_sends')
    .insert({
      post_id: postId,
      contact_id: contactId,
      phone,
      provider,
      provider_msg_id: providerMsgId,
      status,
      error_message: errorMessage
    })

  if (error) console.error('Erro ao registrar envio:', error.message)
}

/** Cria ou atualiza registro de campanha */
export async function upsertCampaign({ postId, totalSent, totalOk, totalFail, finishedAt }) {
  const { error } = await supabase
    .from('campaigns')
    .upsert({
      post_id: postId,
      total_sent: totalSent,
      total_ok: totalOk,
      total_fail: totalFail,
      finished_at: finishedAt
    }, { onConflict: 'post_id' })

  if (error) console.error('Erro ao salvar campanha:', error.message)
}
