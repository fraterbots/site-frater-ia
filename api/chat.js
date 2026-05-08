module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { sessionId, message, source, ts } = req.body ?? {}

  if (!message?.trim()) {
    return res.status(400).json({ error: 'Mensagem vazia.' })
  }

  const webhookUrl = process.env.N8N_WEBHOOK_URL
  if (!webhookUrl) {
    console.error('N8N_WEBHOOK_URL não configurado')
    return res.status(200).json({
      reply: 'Serviço temporariamente indisponível. Fale pelo WhatsApp: (38) 99100-3466 🙏',
    })
  }

  try {
    const upstream = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sessionId || 'anon',
        message: message.trim(),
        source: source || 'landing-frater-ia',
        ts: ts || Date.now(),
      }),
      signal: AbortSignal.timeout(15_000),
    })

    if (!upstream.ok) {
      throw new Error(`n8n retornou status ${upstream.status}`)
    }

    const data = await upstream.json().catch(() => ({}))
    const reply =
      data.reply ??
      data.message ??
      data.output ??
      data.text ??
      'Recebi sua mensagem! Em breve um dos irmãos entra em contato.'

    return res.status(200).json({ reply })
  } catch (err) {
    console.error('n8n error:', err.message)
    return res.status(200).json({
      reply: 'Tive um problema para te responder agora. Fale direto no WhatsApp: (38) 99100-3466 🙏',
    })
  }
}
