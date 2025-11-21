import type { NextApiRequest, NextApiResponse } from 'next'

interface ContactRequestBody {
  name?: string
  email?: string
  subject?: string
  message?: string
}

const RESEND_API_KEY = process.env.RESEND_API_KEY
const CONTACT_RECIPIENT = 'proptrenz@gmail.com'
const CONTACT_FROM =
  process.env.CONTACT_FORM_FROM_EMAIL || 'PropTrenz Contact <support@proptrenz.com>'

async function sendEmail(payload: { name: string; email: string; subject: string; message: string }) {
  if (!RESEND_API_KEY) {
    throw new Error('Resend API key is not configured')
  }

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #1f2937;">
      <h2 style="margin: 0 0 16px; color: #1d4ed8;">New contact message</h2>
      <p style="margin: 0 0 8px;"><strong>Name:</strong> ${payload.name}</p>
      <p style="margin: 0 0 8px;"><strong>Email:</strong> ${payload.email}</p>
      ${payload.subject ? `<p style="margin: 0 0 8px;"><strong>Subject:</strong> ${payload.subject}</p>` : ''}
      <div style="margin-top: 24px;">
        <p style="margin: 0 0 8px;"><strong>Message</strong></p>
        <div style="white-space: pre-line; background: #f3f4f6; border-radius: 12px; padding: 16px;">${payload.message}</div>
      </div>
    </div>
  `

  const body = {
    from: CONTACT_FROM,
    to: [CONTACT_RECIPIENT],
    subject: payload.subject || `New PropTrenz message from ${payload.name}`,
    reply_to: `${payload.name} <${payload.email}>`,
    html,
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => null)
    throw new Error(error?.message || response.statusText || 'Failed to send email')
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { name, email, subject, message } = (req.body || {}) as ContactRequestBody

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    await sendEmail({
      name: name.trim(),
      email: email.trim(),
      subject: subject?.trim() ?? '',
      message: message.trim(),
    })

    res.status(200).json({ success: true })
  } catch (error: any) {
    console.error('[api/contact] Failed to send contact message', error)
    res.status(500).json({ error: error?.message || 'Failed to send contact message' })
  }
}


