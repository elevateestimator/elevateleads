// api/apply.js (Vercel Serverless Function - Node 18+)
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const {
      committed = '', avg_job_size = '', jobs_per_month = '',
      company = '', email = '', phone = '', website = '' // honeypot
    } = body;

    // Simple validations
    if (website) return res.status(200).json({ ok: true }); // bot honeypot
    if (!committed || !company || !email || !phone) {
      return res.status(400).json({ ok: false, error: 'Missing required fields' });
    }

    const subject = `Elevate Leads — New Application from ${company}`;
    const html = `
      <h2>New Application</h2>
      <ul>
        <li><strong>Committed to invest:</strong> ${committed}</li>
        <li><strong>Average job size:</strong> ${avg_job_size}</li>
        <li><strong>Jobs per month:</strong> ${jobs_per_month}</li>
        <li><strong>Company:</strong> ${company}</li>
        <li><strong>Email:</strong> ${email}</li>
        <li><strong>Phone:</strong> ${phone}</li>
      </ul>
      <p>Reply to this email to contact the applicant directly.</p>
    `.trim();

    const text = `
New Application

Committed to invest: ${committed}
Average job size: ${avg_job_size}
Jobs per month: ${jobs_per_month}
Company: ${company}
Email: ${email}
Phone: ${phone}
    `.trim();

    const pmRes = await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Postmark-Server-Token': process.env.POSTMARK_SERVER_TOKEN
      },
      body: JSON.stringify({
        From: process.env.POSTMARK_FROM,        // estimates@elevateestimator.com
        To: process.env.POSTMARK_TO,            // jacob@elevateestimator.com
        ReplyTo: email,                         // reply goes to applicant
        Subject: subject,
        HtmlBody: html,
        TextBody: text,
        MessageStream: process.env.POSTMARK_STREAM || 'outbound',
        Tag: 'apply'
      })
    });

    const data = await pmRes.json();
    if (!pmRes.ok) {
      return res.status(500).json({ ok: false, error: data.Message || 'Postmark error' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
}
