const { getOAuthClient } = require('./_utils');

module.exports = async function handler(req, res) {
  try {
    const oauth2Client = getOAuthClient('/api/native-google-callback');
    
    // Generate an OAuth URL
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      state: req.query.sessionId || 'prod',
      scope: [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/calendar.events.readonly'
      ]
    });

    // Redirect the user to Google's consent screen
    res.redirect(authUrl);
  } catch (error) {
    console.error('Error in native-google-auth:', error);
    res.status(500).send('Failed to generate Google Auth URL.');
  }
};
