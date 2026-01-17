function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function renderMagicLinkEmail(params: {
  callbackUrl: string;
  logoUrl?: string;
  copyIconUrl?: string;
  expiresMinutes?: number;
}) {
  const expiresMinutes = params.expiresMinutes ?? 10;
  const callbackUrlEscaped = escapeHtml(params.callbackUrl);
  const logoUrl = params.logoUrl ? escapeHtml(params.logoUrl) : null;
  const copyIconUrl = params.copyIconUrl ? escapeHtml(params.copyIconUrl) : null;

  const preheader = `Your sign-in link (expires in ${expiresMinutes} minutes).`;

  return [
    `<!doctype html>`,
    `<html lang="en">`,
    `<head>`,
    `<meta charset="utf-8" />`,
    `<meta name="viewport" content="width=device-width, initial-scale=1" />`,
    `<meta name="x-apple-disable-message-reformatting" />`,
    `<title>Sign in to Frilpp</title>`,
    `</head>`,
    `<body style="margin:0; padding:0; background:#0b0c10;">`,
    `<div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">${escapeHtml(
      preheader,
    )}</div>`,
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#0b0c10;">`,
    `<tr>`,
    `<td align="center" style="padding:32px 16px;">`,
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="width:560px; max-width:560px;">`,
    `<tr>`,
    `<td style="padding:0 0 16px 0;">`,
    `<div style="display:flex; align-items:center; gap:10px;">`,
    logoUrl
      ? `<div style="width:36px; height:36px; border:2px solid #00d07a; background:#0b0c10; overflow:hidden;"><img src="${logoUrl}" width="36" height="36" alt="Frilpp" style="display:block; width:36px; height:36px; object-fit:contain; image-rendering:pixelated;" /></div>`
      : `<div style="width:36px; height:36px; border:2px solid #00d07a; background:#09130f;"><div style="width:100%; height:100%; background-image: linear-gradient(#00d07a 1px, transparent 1px), linear-gradient(90deg, #00d07a 1px, transparent 1px); background-size: 9px 9px; opacity:0.25;"></div></div>`,
    `<div style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; letter-spacing: 2px; font-weight: 800; font-size: 16px; line-height: 1;">`,
    `<span style="color:#00d07a;">FRI</span><span style="color:#ff4aa2;">L</span><span style="color:#00d07a;">PP</span>`,
    `</div>`,
    `</div>`,
    `</td>`,
    `</tr>`,
    `<tr>`,
    `<td style="border:2px solid #00d07a; background:#101218; padding:22px; box-shadow: 6px 6px 0 #00d07a;">`,
    `<div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; color:#f4f7ff;">`,
    `<div style="font-weight:800; font-size:20px; line-height:1.2; margin:0 0 10px 0;">Sign in to Frilpp</div>`,
    `<div style="color:#b5bdcc; font-size:14px; line-height:1.6; margin:0 0 16px 0;">`,
    `Use the button below to securely sign in. This link expires in <strong style="color:#f4f7ff;">${expiresMinutes} minutes</strong>.`,
    `</div>`,
    `<div style="margin: 18px 0 18px 0;">`,
    `<a href="${callbackUrlEscaped}" style="display:inline-block; background:#00d07a; color:#0b0c10; text-decoration:none; padding:12px 16px; border:2px solid #00d07a; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-weight:800; letter-spacing:1px; text-transform:uppercase;">`,
    `Sign in →`,
    `</a>`,
    `</div>`,
    `<div style="border-top:1px solid #222633; margin:18px 0; padding-top:14px; color:#b5bdcc; font-size:12px; line-height:1.6;">`,
    `<div style="margin:0 0 8px 0;">If the button doesn’t work, copy and paste this link:</div>`,
    `<div style="word-break:break-all; background:#0b0c10; border:1px solid #222633; padding:10px 12px;">`,
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>`,
    `<td style="padding:0; vertical-align:top;">`,
    `<a href="${callbackUrlEscaped}" style="color:#86fbd1; text-decoration:underline;">${callbackUrlEscaped}</a>`,
    `</td>`,
    `<td align="right" style="padding:0 0 0 10px; vertical-align:top; white-space:nowrap;">`,
    copyIconUrl
      ? `<img src="${copyIconUrl}" width="16" height="16" alt="Copy" style="display:inline-block; vertical-align:middle;" />`
      : ``,
    `</td>`,
    `</tr></table>`,
    `</div>`,
    `</div>`,
    `<div style="color:#7f8796; font-size:12px; line-height:1.6; margin-top:14px;">`,
    `If you didn’t request this email, you can safely ignore it.`,
    `</div>`,
    `</div>`,
    `</td>`,
    `</tr>`,
    `<tr>`,
    `<td style="padding:16px 4px 0 4px; color:#7f8796; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; font-size:12px; line-height:1.6;">`,
    `<div>Need help? Reply to this email or contact <a href="mailto:hello@frilpp.com" style="color:#86fbd1; text-decoration:underline;">hello@frilpp.com</a>.</div>`,
    `</td>`,
    `</tr>`,
    `</table>`,
    `</td>`,
    `</tr>`,
    `</table>`,
    `</body>`,
    `</html>`,
  ].join("");
}
