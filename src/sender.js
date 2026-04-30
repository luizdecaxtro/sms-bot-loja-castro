// src/sender.js — envia mensagens WhatsApp via Whapi.Cloud
import {
  getActiveContacts,
  logSmsSend,
  updatePostStatus,
  upsertCampaign
} from './db.js'

async function sendOne({ phone, content }) {
  try {
    const baseUrl = process.env.WHAPI_URL.replace(/\/$/, '')
    const to = phone.replace(/\D/g, '') + '@s.whatsapp.net'

    const response = await fetch(`${baseUrl}/messages/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.WHAPI_TOKEN}`
      },
      body: JSON.stringify({ to, body: content })
    })

    const data = await response.json()

    if (data.sent || data.id || response.ok) {
      return { ok: true, msgId: data.id || 'sent' }
    } else {
      return { ok: false, error: JSON.stringify(data) }
    }

  } catch (err) {
    return { ok: false, error: err.message }
  }
}

export async function sendCampaign(post) {
  console.log(`\n📱 Iniciando campanha WhatsApp Whapi: "${post.source_title}"`)
  const contacts = await getActiveContacts()
  console.log(`👥 ${contacts.length} contatos ativos encontrados`)

  let ok = 0, fail = 0

  for (const contact of contacts) {
    const result = await sendOne({ phone: contact.phone, content: post.content })

    await logSmsSend({
      postId:        post.id,
      contactId:     contact.id,
      phone:         contact.phone,
      provider:      'whapi-whatsapp',
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
