// src/sender.js — envia mensagens WhatsApp via Z-API
import {
  getActiveContacts,
  logSmsSend,
  updatePostStatus,
  upsertCampaign
} from './db.js'

async function sendOne({ phone, content }) {
  try {


const ZAPI_URL = 'https://api.z-api.io/instances/3F2318D4494451BF5F185E89C7AD0B90/token/3919C0A6923A35552441D2B8/send-text'  

console.log('URL:', ZAPI_URL)  

const response = await fetch(ZAPI_URL, {
  method: 'POST',
  
headers: { 
  'Content-Type': 'application/json',
  'Client-Token': process.env.ZAPI_CLIENT_TOKEN
},

  body: JSON.stringify({
    phone: phone.replace('+', ''),
    message: content
  })
})

    const data = await response.json()
    if (data.zaapId || data.messageId || response.ok) {
      return { ok: true, msgId: data.zaapId || data.messageId || 'sent' }
    } else {
      return { ok: false, error: JSON.stringify(data) }
    }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

export async function sendCampaign(post) {
  console.log(`\n📱 Iniciando campanha WhatsApp Z-API: "${post.source_title}"`)
  const contacts = await getActiveContacts()
  console.log(`👥 ${contacts.length} contatos ativos encontrados`)

  let ok = 0, fail = 0

  for (const contact of contacts) {
    const result = await sendOne({ phone: contact.phone, content: post.content })

    await logSmsSend({
      postId:        post.id,
      contactId:     contact.id,
      phone:         contact.phone,
      provider:      'zapi-whatsapp',
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

    await new Promise(r => setTimeout(r, 500))
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