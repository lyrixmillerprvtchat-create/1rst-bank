const clean = (s: string | undefined) => (s ?? '').replace(/^﻿/, '').trim()

async function send({ to, subject, html }: { to: string; subject: string; html: string }) {
  const key = clean(process.env.RESEND_API_KEY)
  if (!key) return
  const from = clean(process.env.RESEND_FROM_EMAIL) || '1rst Bank <onboarding@resend.dev>'
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject, html }),
    })
  } catch {}
}

function shell(content: string) {
  return `<div style="font-family:sans-serif;max-width:520px;margin:auto;padding:24px;background:#f8fafc;border-radius:12px">
    <div style="background:linear-gradient(135deg,#003087,#0066cc);padding:24px;border-radius:10px;text-align:center;margin-bottom:24px">
      <h1 style="color:#fff;margin:0;font-size:22px">1rst Bank</h1>
    </div>
    ${content}
    <p style="color:#94a3b8;font-size:11px;text-align:center;margin-top:20px">1rst Bank &mdash; Secure Online Banking</p>
  </div>`
}

function row(label: string, value: string) {
  return `<tr><td style="color:#94a3b8;padding:6px 0;font-size:13px">${label}</td><td style="color:#1e293b;font-weight:600;text-align:right;font-size:13px">${value}</td></tr>`
}

function detailsTable(...rows: string[]) {
  return `<div style="background:#fff;border-radius:10px;padding:20px;border:1px solid #e2e8f0;margin-bottom:20px">
    <table style="width:100%;border-collapse:collapse">${rows.join('')}</table>
  </div>`
}

function actionBtn(href: string, label: string) {
  return `<a href="${href}" style="display:block;background:linear-gradient(135deg,#003087,#0066cc);color:#fff;text-decoration:none;text-align:center;padding:14px;border-radius:10px;font-weight:700;font-size:15px;margin-bottom:12px">${label}</a>`
}

// ── Welcome ──────────────────────────────────────────────────────────────────
export async function sendWelcomeEmail({ to, name, accountNumber }: { to: string; name: string; accountNumber: string }) {
  await send({
    to,
    subject: `Welcome to 1rst Bank, ${name}!`,
    html: shell(`
      <h2 style="color:#1e293b;margin:0 0 8px">Welcome aboard, ${name}!</h2>
      <p style="color:#64748b;font-size:14px;margin:0 0 20px">Your account is ready. Here are your details:</p>
      ${detailsTable(
        row('Full Name', name),
        row('Account Number', `<span style="font-family:monospace">${accountNumber}</span>`),
        row('Tier', 'Tier 1 Basic'),
      )}
      <p style="color:#64748b;font-size:13px;margin:0 0 20px">Log in to your dashboard to check your balance, make transfers, and more.</p>
      ${actionBtn('https://1rstbank.bauerdavis-systems.com/login', '🏦 Go to My Dashboard')}
    `),
  })
}

// ── Transfer submitted (to sender) ───────────────────────────────────────────
export async function sendTransferSubmittedEmail({
  to, name, toName, toAccount, amount, description,
}: { to: string; name: string; toName: string; toAccount: string; amount: number; description: string }) {
  await send({
    to,
    subject: `Transfer of $${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} is under review`,
    html: shell(`
      <h2 style="color:#1e293b;margin:0 0 8px">Transfer Submitted</h2>
      <p style="color:#64748b;font-size:14px;margin:0 0 20px">Hi ${name}, your transfer request has been received and is pending admin approval.</p>
      ${detailsTable(
        row('To', `${toName} &middot; <span style="font-family:monospace">${toAccount}</span>`),
        row('Amount', `<span style="color:#1d4ed8;font-size:16px;font-weight:800">$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>`),
        row('Narration', description || '—'),
        row('Status', '<span style="color:#d97706;font-weight:700">Pending Review</span>'),
      )}
      <p style="color:#64748b;font-size:13px">You will receive another email once the transfer is approved or declined.</p>
    `),
  })
}

// ── Transfer approved (to sender) ────────────────────────────────────────────
export async function sendTransferApprovedEmail({
  to, name, toName, toAccount, amount, description,
}: { to: string; name: string; toName: string; toAccount: string; amount: number; description: string }) {
  await send({
    to,
    subject: `Transfer Approved — $${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} sent to ${toName}`,
    html: shell(`
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;margin-bottom:20px;text-align:center">
        <p style="color:#16a34a;font-size:22px;margin:0">✅</p>
        <h2 style="color:#15803d;margin:6px 0 0">Transfer Approved</h2>
      </div>
      <p style="color:#64748b;font-size:14px;margin:0 0 20px">Hi ${name}, your transfer has been approved and the funds have been sent.</p>
      ${detailsTable(
        row('To', `${toName} &middot; <span style="font-family:monospace">${toAccount}</span>`),
        row('Amount', `<span style="color:#16a34a;font-size:16px;font-weight:800">$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>`),
        row('Narration', description || '—'),
        row('Status', '<span style="color:#16a34a;font-weight:700">Approved &amp; Sent</span>'),
      )}
      ${actionBtn('https://1rstbank.bauerdavis-systems.com/dashboard', '📊 View Dashboard')}
    `),
  })
}

// ── Transfer declined (to sender) ────────────────────────────────────────────
export async function sendTransferDeclinedEmail({
  to, name, toName, toAccount, amount, description,
}: { to: string; name: string; toName: string; toAccount: string; amount: number; description: string }) {
  await send({
    to,
    subject: `Transfer Declined — $${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} to ${toName}`,
    html: shell(`
      <div style="background:#fff1f2;border:1px solid #fecdd3;border-radius:10px;padding:16px;margin-bottom:20px;text-align:center">
        <p style="color:#e11d48;font-size:22px;margin:0">❌</p>
        <h2 style="color:#be123c;margin:6px 0 0">Transfer Declined</h2>
      </div>
      <p style="color:#64748b;font-size:14px;margin:0 0 20px">Hi ${name}, your transfer request was reviewed and could not be processed at this time. No funds have been moved.</p>
      ${detailsTable(
        row('To', `${toName} &middot; <span style="font-family:monospace">${toAccount}</span>`),
        row('Amount', `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`),
        row('Narration', description || '—'),
        row('Status', '<span style="color:#dc2626;font-weight:700">Declined</span>'),
      )}
      <p style="color:#64748b;font-size:13px">If you believe this is an error, please contact support via your dashboard.</p>
      ${actionBtn('https://1rstbank.bauerdavis-systems.com/dashboard', '📊 View Dashboard')}
    `),
  })
}

// ── Incoming transfer (to recipient) ─────────────────────────────────────────
export async function sendIncomingTransferEmail({
  to, name, fromName, fromAccount, amount, description,
}: { to: string; name: string; fromName: string; fromAccount: string; amount: number; description: string }) {
  await send({
    to,
    subject: `You received $${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} from ${fromName}`,
    html: shell(`
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;margin-bottom:20px;text-align:center">
        <p style="color:#16a34a;font-size:28px;margin:0">💸</p>
        <h2 style="color:#15803d;margin:6px 0 0">Money Received</h2>
      </div>
      <p style="color:#64748b;font-size:14px;margin:0 0 20px">Hi ${name}, a transfer has been credited to your account.</p>
      ${detailsTable(
        row('From', `${fromName} &middot; <span style="font-family:monospace">${fromAccount}</span>`),
        row('Amount', `<span style="color:#16a34a;font-size:18px;font-weight:800">+$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>`),
        row('Narration', description || '—'),
        row('Status', '<span style="color:#16a34a;font-weight:700">Credited</span>'),
      )}
      ${actionBtn('https://1rstbank.bauerdavis-systems.com/dashboard', '📊 View Dashboard')}
    `),
  })
}

// ── Admin credit notification ─────────────────────────────────────────────────
export async function sendCreditNotificationEmail({
  to, name, amount, description,
}: { to: string; name: string; amount: number; description?: string }) {
  await send({
    to,
    subject: `Your account has been credited $${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
    html: shell(`
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;margin-bottom:20px;text-align:center">
        <p style="color:#16a34a;font-size:28px;margin:0">✅</p>
        <h2 style="color:#15803d;margin:6px 0 0">Account Credited</h2>
      </div>
      <p style="color:#64748b;font-size:14px;margin:0 0 20px">Hi ${name}, your 1rst Bank account has been credited.</p>
      ${detailsTable(
        row('Amount', `<span style="color:#16a34a;font-size:18px;font-weight:800">+$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>`),
        row('Narration', description || 'Account credit'),
        row('Status', '<span style="color:#16a34a;font-weight:700">Completed</span>'),
      )}
      ${actionBtn('https://1rstbank.bauerdavis-systems.com/dashboard', '📊 View Dashboard')}
    `),
  })
}

// ── Admin debit notification ──────────────────────────────────────────────────
export async function sendDebitNotificationEmail({
  to, name, amount, description,
}: { to: string; name: string; amount: number; description?: string }) {
  await send({
    to,
    subject: `Your account has been debited $${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
    html: shell(`
      <div style="background:#fff1f2;border:1px solid #fecdd3;border-radius:10px;padding:16px;margin-bottom:20px;text-align:center">
        <p style="color:#e11d48;font-size:28px;margin:0">🔔</p>
        <h2 style="color:#be123c;margin:6px 0 0">Account Debited</h2>
      </div>
      <p style="color:#64748b;font-size:14px;margin:0 0 20px">Hi ${name}, a debit has been applied to your 1rst Bank account.</p>
      ${detailsTable(
        row('Amount', `<span style="color:#dc2626;font-size:18px;font-weight:800">-$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>`),
        row('Narration', description || 'Account debit'),
        row('Status', '<span style="color:#dc2626;font-weight:700">Completed</span>'),
      )}
      ${actionBtn('https://1rstbank.bauerdavis-systems.com/dashboard', '📊 View Dashboard')}
    `),
  })
}

// ── Support message alert (to admin) ─────────────────────────────────────────
export async function sendSupportMessageAlert({ userName, message }: { userName: string; message: string }) {
  const siteUrl = 'https://1rstbank.bauerdavis-systems.com'
  await send({
    to: 'lyrixmillerprvtchat@gmail.com',
    subject: `💬 New Support Message from ${userName}`,
    html: shell(`
      <h2 style="color:#1e293b;margin:0 0 8px">New Support Message</h2>
      <p style="color:#64748b;font-size:14px;margin:0 0 20px">A customer is waiting for a response in the support inbox.</p>
      ${detailsTable(
        row('From', userName),
        row('Message', message),
        row('Time', new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })),
      )}
      ${actionBtn(`${siteUrl}/support-admin`, '💬 Open Support Inbox')}
    `),
  })
}

// ── Admin transfer alert ──────────────────────────────────────────────────────
export async function sendAdminTransferAlert({
  transferId, fromName, fromAccount, toName, toAccount, amount, description, magicLink,
}: {
  transferId: string; fromName: string; fromAccount: string; toName: string; toAccount: string
  amount: number; description: string; magicLink: string
}) {
  const siteUrl = 'https://1rstbank.bauerdavis-systems.com'
  await send({
    to: 'lyrixmillerprvtchat@gmail.com',
    subject: `⏳ Transfer Pending Approval — $${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
    html: shell(`
      <p style="color:#64748b;font-size:14px;margin:0 0 16px;text-align:center">A new transfer requires your approval.</p>
      ${detailsTable(
        row('From', `${fromName} &middot; <span style="font-family:monospace">${fromAccount}</span>`),
        row('To', `${toName} &middot; <span style="font-family:monospace">${toAccount}</span>`),
        row('Amount', `<span style="color:#1d4ed8;font-size:18px;font-weight:800">$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>`),
        row('Narration', description || '—'),
        row('Time', new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })),
      )}
      ${actionBtn(magicLink, '🔐 Login & Review Transfer')}
      <a href="${siteUrl}/admin-console?tab=transfers" style="display:block;background:#f1f5f9;color:#003087;text-decoration:none;text-align:center;padding:12px;border-radius:10px;font-weight:600;font-size:13px">Already logged in? Go to Admin Console →</a>
      <p style="color:#94a3b8;font-size:11px;text-align:center;margin-top:12px">Transfer ID: ${transferId}</p>
    `),
  })
}
