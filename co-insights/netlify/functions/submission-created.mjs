// Runs automatically on every verified Netlify Forms submission (Netlify's "submission-created" event).
// Sends the visitor an email through Resend:
//   district-guide  -> guide delivery email, with a paragraph matched to their situation
//   property-review -> confirmation that the request was received
//
// Netlify environment variables (Site configuration > Environment variables):
//   RESEND_API_KEY   required  the API key from resend.com (never commit it to the code)
//   EMAIL_FROM       required  a sender on a domain verified in Resend, e.g. "Sarita Lawrence <guide@yourdomain.com>"
//   EMAIL_REPLY_TO   optional  where replies go (defaults to sarita.lawrence@cbrealty.com)
//   SITE_URL         optional  the live site address (defaults to Netlify's own URL for the site)
// If the key or sender is missing, the form submission is still saved; only the email is skipped.

const AGENT = {
  name: 'Sarita Lawrence, REALTOR®',
  phone: '740-262-7288',
  email: 'sarita.lawrence@cbrealty.com'
};

const GUIDE_PATH = '/downloads/central-ohio-school-district-research-guide.pdf';

const SITUATION = {
  buying: 'A good place to start is page 3. Before you fall in love with a house, confirm its school district on the county auditor\'s site. It doesn\'t always match the mailing city, and it affects your tax bill.',
  selling: 'Page 8 has a short list of what buyers usually ask about. Having your district, yearly taxes and recent improvements written down ahead of time keeps things moving once showings start.',
  staying: 'Pages 6 and 7 are the ones I\'d read first. They cover how levies show up on your tax bill, the credits you may qualify for, and how to keep an eye on what your district may ask voters for next.',
  researching: 'Take it at your own pace. The worksheet on page 9 is handy for keeping notes on more than one district side by side.'
};

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const clean = (s, max = 120) => String(s ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, max);
const validEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || '').trim());

function shell({ site, preheader, bodyHtml }) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;padding:0;background:#F6F2EA;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F2EA;padding:32px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FCFAF6;border-top:4px solid #8A6A35;">
<tr><td style="padding:32px 36px 8px;font-family:Georgia,'Times New Roman',serif;color:#1C1B1A;">
  <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#8A6A35;">Central Ohio School District Insights</div>
</td></tr>
<tr><td style="padding:8px 36px 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#45423F;">
${bodyHtml}
</td></tr>
<tr><td style="padding:20px 36px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#45423F;border-top:1px solid #E7E0D4;">
  <div style="font-family:Georgia,'Times New Roman',serif;font-size:15px;color:#1C1B1A;">${esc(AGENT.name)}</div>
  <div>${esc(AGENT.phone)} &middot; <a href="mailto:${AGENT.email}" style="color:#8A6A35;">${esc(AGENT.email)}</a></div>
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:14px;"><tr>
    <td style="padding-right:24px;"><img src="${site}/assets/brand-agency.png" alt="The Agency Real Estate Group" height="54" style="display:block;height:54px;width:auto;"></td>
    <td><img src="${site}/assets/brand-cb.png" alt="Coldwell Banker Realty" height="54" style="display:block;height:54px;width:auto;"></td>
  </tr></table>
</td></tr>
<tr><td style="padding:16px 36px 28px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.6;color:#67625C;background:#F1ECE3;">
  Central Ohio School District Insights is an independent educational resource and is not affiliated with or endorsed by the State of Ohio, any school district or any board of elections. Equal Housing Opportunity.<br>
  You're receiving this one-time email because you made a request on our website.
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function guideEmail(data, site) {
  const first = clean(data.first_name, 60) || 'there';
  const district = clean(data.district, 80);
  const situation = SITUATION[clean(data.situation, 20)] || SITUATION.researching;
  const link = `${site}${GUIDE_PATH}`;
  const districtLine = district
    ? `If ${esc(district)} is on your mind, you can find its official links on the website anytime: report cards, election results and tax lookups, all in one place.`
    : 'You can also explore any district on the website anytime: report cards, election results and tax lookups, all in one place.';
  const bodyHtml = `
  <p style="margin:0 0 14px;">Hi ${esc(first)},</p>
  <p style="margin:0 0 14px;">Thanks for requesting the Central Ohio School District Research Guide. Here it is:</p>
  <p style="margin:0 0 20px;"><a href="${link}" style="display:inline-block;background:#8A6A35;color:#FBF8F2;text-decoration:none;font-weight:bold;padding:13px 22px;">Download your guide</a></p>
  <p style="margin:0 0 14px;">Inside, you'll find five steps that walk you through the official sources for any district: how to confirm the district for an address, read an Ohio School Report Card, find levy results, understand what you'll pay in taxes, and look at a district's finances. There's also a worksheet you can print for each home you're considering.</p>
  <p style="margin:0 0 14px;">${esc(situation)}</p>
  <p style="margin:0 0 14px;">${districtLine} <a href="${site}/" style="color:#8A6A35;">Visit the website</a></p>
  <p style="margin:0 0 14px;">If questions come up about a specific home, just reply to this email. I'm happy to walk through the records with you.</p>
  <p style="margin:0 0 6px;">Sarita</p>`;
  const text = [
    `Hi ${first},`, '',
    'Thanks for requesting the Central Ohio School District Research Guide. Download it here:', link, '',
    'Inside, you\'ll find five steps that walk you through the official sources for any district, plus a worksheet you can print for each home you\'re considering.', '',
    situation, '',
    'If questions come up about a specific home, just reply to this email. I\'m happy to walk through the records with you.', '',
    'Sarita', AGENT.name, `${AGENT.phone} | ${AGENT.email}`, 'The Agency Real Estate Group | Coldwell Banker Realty', '',
    'Central Ohio School District Insights is an independent educational resource and is not affiliated with or endorsed by the State of Ohio, any school district or any board of elections. Equal Housing Opportunity.'
  ].join('\n');
  return {
    subject: 'Your Central Ohio School District Research Guide',
    html: shell({ site, preheader: 'Five steps to research any district, plus a printable worksheet.', bodyHtml }),
    text
  };
}

function reviewEmail(data, site) {
  const first = clean(data.name, 80).split(' ')[0] || 'there';
  const address = clean(data.address, 160);
  const bodyHtml = `
  <p style="margin:0 0 14px;">Hi ${esc(first)},</p>
  <p style="margin:0 0 14px;">Thank you for requesting a personalized property review${address ? ` for <strong style="color:#1C1B1A;">${esc(address)}</strong>` : ''}.</p>
  <p style="margin:0 0 14px;">This isn't an automated estimate. I'll personally look at your home's details, the improvements you shared, and recent sales and listings nearby, then send your review by email. If I have any questions along the way, I'll reach out.</p>
  <p style="margin:0 0 14px;">If there's anything you'd like me to know in the meantime, just reply to this email.</p>
  <p style="margin:0 0 6px;">Sarita</p>`;
  const text = [
    `Hi ${first},`, '',
    `Thank you for requesting a personalized property review${address ? ` for ${address}` : ''}.`, '',
    'This isn\'t an automated estimate. I\'ll personally look at your home\'s details, the improvements you shared, and recent sales and listings nearby, then send your review by email.', '',
    'If there\'s anything you\'d like me to know in the meantime, just reply to this email.', '',
    'Sarita', AGENT.name, `${AGENT.phone} | ${AGENT.email}`, 'The Agency Real Estate Group | Coldwell Banker Realty'
  ].join('\n');
  return {
    subject: 'We received your property review request',
    html: shell({ site, preheader: 'Sarita will personally review your home and follow up by email.', bodyHtml }),
    text
  };
}

export async function handler(event) {
  let payload;
  try {
    payload = JSON.parse(event.body || '{}').payload || {};
  } catch {
    return { statusCode: 400, body: 'Bad payload' };
  }
  const form = payload.form_name;
  const data = payload.data || {};
  const to = clean(data.email, 254);

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    console.warn('Email skipped: set RESEND_API_KEY and EMAIL_FROM in Netlify environment variables.');
    return { statusCode: 200, body: 'Email not configured' };
  }
  if (!validEmail(to)) return { statusCode: 200, body: 'No valid email on submission' };
  if (data['bot-field']) return { statusCode: 200, body: 'Ignored' };

  const site = (process.env.SITE_URL || process.env.URL || '').replace(/\/$/, '');
  let message;
  if (form === 'district-guide') message = guideEmail(data, site);
  else if (form === 'property-review') message = reviewEmail(data, site);
  else return { statusCode: 200, body: `No email for form ${form}` };

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: process.env.EMAIL_REPLY_TO || AGENT.email,
      subject: message.subject,
      html: message.html,
      text: message.text,
      tags: [{ name: 'form', value: form.replace(/[^a-zA-Z0-9_-]/g, '_') }]
    })
  });
  if (!res.ok) {
    console.error('Resend error', res.status, await res.text());
    return { statusCode: 200, body: 'Email failed' };
  }
  return { statusCode: 200, body: 'Email sent' };
}
