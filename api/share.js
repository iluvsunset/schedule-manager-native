const admin = require('firebase-admin');

// --- SHARED INIT ---
function getServiceAccount() {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT && !process.env.FIREBASE_SERVICE_ACCOUNT.includes('"private_key": "..."')) {
      const creds = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      if (creds.private_key) creds.private_key = creds.private_key.replace(/\\n/g, '\n');
      return creds;
    }
    const fs = require('fs');
    const path = require('path');
    const localPath = path.resolve(process.cwd(), 'service-account.json');
    if (fs.existsSync(localPath)) return require(localPath);
    return null;
  } catch (e) { return null; }
}

if (!admin.apps.length) {
  try {
    const sa = getServiceAccount();
    if (sa) admin.initializeApp({ credential: admin.credential.cert(sa) });
  } catch(e) {}
}

// --- HTML RENDERER (Chronos Branding) ---
function renderPage(title, body, meta = {}) {
    const accent = '#0070F3';
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title} — Chronos</title>
        <meta property="og:title" content="${title}">
        <meta property="og:description" content="${meta.desc || 'View this schedule event on Chronos.'}">
        <meta name="theme-color" content="#0A0A0A">
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                background: #0A0A0A;
                color: #EDEDED;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                padding: 20px;
                -webkit-font-smoothing: antialiased;
            }
            .card {
                background: #191919;
                border: 1px solid rgba(255,255,255,0.08);
                padding: 48px 40px;
                border-radius: 20px;
                max-width: 480px;
                width: 100%;
                box-shadow: 0 24px 60px rgba(0,0,0,0.6);
                text-align: center;
                position: relative;
            }
            .brand {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                font-size: 13px;
                font-weight: 700;
                color: #888;
                letter-spacing: 0.05em;
                text-transform: uppercase;
                margin-bottom: 24px;
            }
            .brand-dot {
                width: 8px; height: 8px;
                border-radius: 50%;
                background: ${accent};
            }
            h1 {
                font-size: 28px;
                font-weight: 800;
                letter-spacing: -0.03em;
                margin-bottom: 8px;
                color: #EDEDED;
            }
            p { color: #888; line-height: 1.6; margin-bottom: 28px; font-size: 15px; }
            .meta-box {
                background: rgba(255,255,255,0.04);
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 14px;
                padding: 20px;
                margin-bottom: 28px;
                text-align: left;
            }
            .label {
                font-size: 11px;
                text-transform: uppercase;
                font-weight: 700;
                color: #555;
                letter-spacing: 0.05em;
                margin-bottom: 4px;
                display: block;
            }
            .val {
                font-size: 15px;
                font-weight: 500;
                display: block;
                margin-bottom: 14px;
                color: #EDEDED;
            }
            .val:last-child { margin-bottom: 0; }
            .btn {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                background: ${accent};
                color: white;
                text-decoration: none;
                padding: 14px 32px;
                border-radius: 10px;
                font-weight: 600;
                font-size: 14px;
                transition: all 0.2s;
                box-shadow: 0 4px 16px rgba(0, 112, 243, 0.3);
            }
            .btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 24px rgba(0, 112, 243, 0.4);
            }
            .icon { font-size: 48px; margin-bottom: 16px; display: inline-block; }
            .expired-badge {
                display: inline-block;
                background: rgba(245, 166, 35, 0.12);
                color: #F5A623;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
                margin-bottom: 16px;
            }
        </style>
    </head>
    <body>
        <div class="card">
            <div class="brand"><div class="brand-dot"></div> Chronos</div>
            ${body}
        </div>
    </body>
    </html>
    `;
}

module.exports = async function handler(req, res) {
    const { id } = req.query;

    if (!id) return res.status(400).send("Missing ID");

    try {
        const db = admin.firestore();
        try { db.settings({ preferRest: true }); } catch (e) {}
        const docRef = db.collection('schedules').doc(id);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            return res.status(404).send(renderPage("Not Found", `<div class="icon">🔍</div><h1>Event Not Found</h1><p>The schedule you're looking for doesn't exist or has been removed.</p><a href="/" class="btn">Go Home</a>`));
        }

        const data = docSnap.data();
        const config = data.shareConfig || {};

        // 1. Check Expiration
        if (config.expiresAt) {
            const now = admin.firestore.Timestamp.now();
            if (config.expiresAt.toMillis() < now.toMillis()) {
                return res.status(410).send(renderPage("Link Expired", `<div class="icon">⏳</div><span class="expired-badge">Expired</span><h1>Link Expired</h1><p>This shared link is no longer active.</p><a href="/" class="btn">Go Home</a>`));
            }
        }

        // 2. Public Access
        if (config.isPublic) {
            const date = data.date.toDate().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
            const time = data.date.toDate().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

            const body = `
                <div class="icon" style="display: inline-flex; align-items: center; justify-content: center; width: 64px; height: 64px; background-color: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; margin-bottom: 16px;">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#0070F3" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                    <circle cx="8" cy="14" r="1.5" fill="#0070F3"></circle>
                    <circle cx="12" cy="14" r="1.5" fill="#0070F3"></circle>
                    <circle cx="16" cy="14" r="1.5" fill="#0070F3"></circle>
                    <circle cx="8" cy="18" r="1.5" fill="#0070F3"></circle>
                    <circle cx="12" cy="18" r="1.5" fill="#0070F3"></circle>
                    <circle cx="16" cy="18" r="1.5" fill="#0070F3"></circle>
                  </svg>
                </div>
                <h1>${data.place}</h1>
                <p>Public Schedule</p>
                <div class="meta-box">
                    <span class="label">Date</span>
                    <span class="val">${date}</span>
                    <span class="label">Time</span>
                    <span class="val">${time}</span>
                    ${data.location ? `<span class="label">Location</span><span class="val">${data.location}</span>` : ''}
                    ${data.notes ? `<span class="label">Notes</span><span class="val" style="font-size:14px; opacity:0.8;">${data.notes}</span>` : ''}
                </div>
                <a href="/" class="btn">Open in Chronos</a>
            `;
            return res.send(renderPage(data.place, body, { desc: `Join ${data.place} on ${date}` }));
        }

        // 3. Restricted
        const appUrl = `https://${req.headers.host}/?view_schedule=${id}`;
        const body = `
            <div class="icon">🔒</div>
            <h1>Restricted Access</h1>
            <p>This event is private. Log in to view the details.</p>
            <a href="${appUrl}" class="btn">Sign In to View</a>
        `;
        return res.send(renderPage("Restricted", body));

    } catch (e) {
        console.error(e);
        return res.status(500).send("Internal Server Error");
    }
};
