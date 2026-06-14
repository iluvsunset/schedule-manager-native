const { getOAuthClient } = require('./_utils');

module.exports = async function handler(req, res) {
  const { uid } = req.query;

  if (!uid) {
    return res.status(400).send('Missing user ID (uid).');
  }

  try {
    const oauth2Client = getOAuthClient();
    
    // Generate an OAuth URL
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline', // Crucial: This gets us the Refresh Token
      prompt: 'consent', // Crucial: Forces Google to give a refresh token even if previously authorized
      scope: [
        'https://www.googleapis.com/auth/calendar.events.readonly'
      ],
      state: `${uid}|${req.query.native === 'true' ? 'native' : 'web'}`, // Pass uid and clientType
    });

    // Redirect the user to Google's consent screen
    res.redirect(authUrl);
  } catch (error) {
    console.error('Error in gcal-auth:', error);
    res.status(500).send('Failed to generate Google Auth URL.');
  }
};
