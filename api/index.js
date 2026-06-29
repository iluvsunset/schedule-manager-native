module.exports = async (req, res) => {
  try {
    const path = req.url.split('?')[0];
    
    const routeMap = {
      '/api/backfill-enddate': require('../server/backfill-enddate.js'),
      '/api/cron': require('../server/cron.js'),
      '/api/email': require('../server/email.js'),
      '/api/export-gcal': require('../server/export-gcal.js'),
      '/api/gcal-auth': require('../server/gcal-auth.js'),
      '/api/gcal-callback': require('../server/gcal-callback.js'),
      '/api/gcal-events': require('../server/gcal-events.js'),
      '/api/gcal-webhook': require('../server/gcal-webhook.js'),
      '/api/native-google-auth': require('../server/native-google-auth.js'),
      '/api/native-google-callback': require('../server/native-google-callback.js'),
      '/api/places': require('../server/places.js'),
      '/api/share': require('../server/share.js'),
      '/api/sync-event-gcal': require('../server/sync-event-gcal.js')
    };

    // Global CORS headers for all responses
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    const handler = routeMap[path] || routeMap[path.replace(/\/$/, '')];

    if (handler) {
      return await handler(req, res);
    }

    return res.status(404).json({ error: 'API route not found' });
  } catch (error) {
    console.error('Error in API router:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
