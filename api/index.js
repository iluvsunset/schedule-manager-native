module.exports = async (req, res) => {
  try {
    const path = req.url.split('?')[0];
    
    // Map paths to the corresponding handler in the server directory
    const routeMap = {
      '/api/backfill-enddate': '../server/backfill-enddate.js',
      '/api/cron': '../server/cron.js',
      '/api/email': '../server/email.js',
      '/api/export-gcal': '../server/export-gcal.js',
      '/api/gcal-auth': '../server/gcal-auth.js',
      '/api/gcal-callback': '../server/gcal-callback.js',
      '/api/gcal-events': '../server/gcal-events.js',
      '/api/gcal-webhook': '../server/gcal-webhook.js',
      '/api/native-google-auth': '../server/native-google-auth.js',
      '/api/native-google-callback': '../server/native-google-callback.js',
      '/api/places': '../server/places.js',
      '/api/share': '../server/share.js',
      '/api/sync-event-gcal': '../server/sync-event-gcal.js'
    };

    const handlerPath = routeMap[path] || routeMap[path.replace(/\/$/, '')];

    if (handlerPath) {
      const handler = require(handlerPath);
      return await handler(req, res);
    }

    return res.status(404).json({ error: 'API route not found' });
  } catch (error) {
    console.error('Error in API router:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
