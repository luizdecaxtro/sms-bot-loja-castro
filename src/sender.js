// src/sender.js — envia mensagens WhatsApp via Meta Cloud API
import {
  getActiveContacts,
  logSmsSend,
  updatePostStatus,
  upsertCampaign
} from './db.js'

const PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID
const META_TOKEN = process.env.META_TOKEN

async function sendOne({ phone, content }) {
  try {
    // Remove o + e espaços do telefone
    const to = phone.replace(/\D/g, '')

    const response = await fetch(
      `https://graph.facebook.com/v25.0/${PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${META_TOKEN}`
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to,
          type: 'text',
          text: { body: content }
        })
      }
    )

    const data = await response.json()

    if (data.messages?.[0]?.id) {
      return { ok: true, msgId: data.messages[0].id }
    } else {
      return { ok: false, error: JSON.stringify(data) }
    }

  } catch (err) {
    return { ok: false, error: err.message }
  }
}

export async function sendCampaign(post) {
  console.log(`\n📱 Iniciando campanha WhatsApp Meta API: "${post.source_title}"`)
  const contacts = await getActiveContacts()
  console.log(`👥 ${contacts.length} contatos ativos encontrados`)

  let ok = 0, fail = 0

  for (const contact of contacts) {
    const result = await sendOne({ phone: contact.phone, content: post.content })

    await logSmsSend({
      postId:        post.id,
      contactId:     contact.id,
      phone:         contact.phone,
      provider:      'meta-whatsapp',
      providerMsgId: result.msgId,
      status:        result.ok ? 'sent' : 'failed',
      errorMessage:  result.error
    })

    if (result.ok) {
      ok++
      console.log(`  ✅ ${contact.name} (${contact.phone})`)
    } else {
      fail++
      console.warn(`  ❌ ${contact.name} (${contact.phone}) — ${result.error}`)
    }

    await new Promise(r => setTimeout(r, 1000))
  }

  await updatePostStatus(post.id, 'sent')
  await upsertCampaign({
    postId:     post.id,
    totalSent:  contacts.length,
    totalOk:    ok,
    totalFail:  fail,
    finishedAt: new Date().toISOString()
  })

  const resumo = { total: contacts.length, ok, fail }
  console.log(`\n📊 Campanha finalizada:`, resumo)
  return resumo
}
