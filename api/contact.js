const { createClient } = require('@supabase/supabase-js')
const { Resend } = require('resend')

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { nome, empresa, email, telefone, area, mensagem } = req.body ?? {}

  if (!nome?.trim() || !email?.trim()) {
    return res.status(400).json({ error: 'Nome e e-mail são obrigatórios.' })
  }

  const lead = {
    nome:          formatName(nome),
    empresa:       formatText(empresa),
    email:         formatEmail(email),
    telefone:      formatPhone(telefone),
    area_interesse: area?.trim() || 'Não informado',
    mensagem:      mensagem?.trim() || '',
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { error: dbError } = await supabase.from('contacts').insert([lead])
  if (dbError) {
    console.error('Supabase error:', dbError.message)
    return res.status(500).json({ error: 'Erro ao salvar. Tente novamente.' })
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: 'Frater IA <noreply@frateria.site>',
      to: 'contato@frateria.site',
      subject: `Novo lead: ${lead.nome} — ${lead.area_interesse}`,
      html: buildEmailHTML(lead),
    })
  } catch (emailErr) {
    console.error('Resend error:', emailErr.message)
    // Não bloqueia o lead; e-mail falhou mas dado já foi salvo
  }

  return res.status(200).json({ ok: true })
}

// ─── formatters ───────────────────────────────────────────────────────────────

function formatName(str) {
  return str.trim()
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

function formatText(str) {
  if (!str?.trim()) return ''
  return str.trim().replace(/\s+/g, ' ')
}

function formatEmail(str) {
  return str.trim().toLowerCase()
}

function formatPhone(str) {
  if (!str?.trim()) return ''
  const d = str.replace(/\D/g, '')
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`
  return str.trim()
}

// ─── email template ───────────────────────────────────────────────────────────

function buildEmailHTML(lead) {
  const row = (label, value) => `
    <tr>
      <td style="padding:10px 14px;color:#888;font-size:13px;white-space:nowrap;border-bottom:1px solid #f0f0f0">${label}</td>
      <td style="padding:10px 14px;font-size:14px;font-weight:600;color:#14133a;border-bottom:1px solid #f0f0f0">${value || '—'}</td>
    </tr>`

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f4f2ea;font-family:sans-serif">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(20,19,58,.08)">
    <div style="background:#14133a;padding:28px 32px">
      <p style="margin:0;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:rgba(244,242,234,.6)">Frater IA — Novo lead</p>
      <h1 style="margin:8px 0 0;font-size:22px;color:#f4f2ea">${lead.nome}</h1>
    </div>
    <table style="width:100%;border-collapse:collapse">
      ${row('Empresa', lead.empresa)}
      ${row('E-mail', `<a href="mailto:${lead.email}" style="color:#14133a">${lead.email}</a>`)}
      ${row('WhatsApp', lead.telefone ? `<a href="https://wa.me/55${lead.telefone.replace(/\D/g,'')}" style="color:#14133a">${lead.telefone}</a>` : '')}
      ${row('Área de interesse', lead.area_interesse)}
      ${row('Mensagem', lead.mensagem)}
    </table>
    <div style="padding:20px 32px;background:#f9f8f4;text-align:right">
      <a href="https://wa.me/5538991003466" style="display:inline-block;padding:10px 20px;background:#14133a;color:#f4f2ea;border-radius:999px;font-size:13px;font-weight:600;text-decoration:none">Responder no WhatsApp →</a>
    </div>
  </div>
</body>
</html>`
}
