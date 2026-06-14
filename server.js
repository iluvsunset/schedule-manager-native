const fs = require('fs');
const path = require('path');
const envLocal = path.resolve(__dirname, '.env.local');
if (fs.existsSync(envLocal)) {
    require('dotenv').config({ path: envLocal });
}
require('dotenv').config();
const express = require('express');
const emailHandler = require('./api/email');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware to parse JSON bodies
app.use(express.json());

// Serve Static Files (Frontend)
app.use(express.static(path.join(__dirname, '/')));

// Clean URL Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const shareHandler = require('./api/share');
const nativeGoogleAuthHandler = require('./api/native-google-auth');
const nativeGoogleCallbackHandler = require('./api/native-google-callback');
const gcalAuthHandler = require('./api/gcal-auth');
const gcalCallbackHandler = require('./api/gcal-callback');

// ...

app.get('/console', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Share Link Route (SSR)
app.get('/share/:id', async (req, res) => {
    req.query.id = req.params.id; // Map param to query for the handler
    try {
        await shareHandler(req, res);
    } catch (e) {
        res.status(500).send("Server Error");
    }
});

// API Routes
app.get('/api/email', (req, res) => {
    res.status(405).json({ error: "Method Not Allowed", message: "This endpoint only accepts POST requests to send emails." });
});

app.post('/api/email', async (req, res) => {
    console.log(`[${new Date().toISOString()}] POST /api/email received request`);
    try {
        await emailHandler(req, res);
    } catch (error) {
        console.error("Route Error:", error);
        if (!res.headersSent) {
            res.status(500).json({ error: "Internal Server Error", details: error.message });
        }
    }
});

app.get('/api/native-google-auth', async (req, res) => {
    try {
        await nativeGoogleAuthHandler(req, res);
    } catch (e) {
        res.status(500).send("Server Error");
    }
});

app.get('/api/native-google-callback', async (req, res) => {
    try {
        await nativeGoogleCallbackHandler(req, res);
    } catch (e) {
        res.status(500).send("Server Error");
    }
});

app.get('/api/gcal-auth', async (req, res) => {
    try {
        await gcalAuthHandler(req, res);
    } catch (e) {
        res.status(500).send("Server Error");
    }
});

app.get('/api/gcal-callback', async (req, res) => {
    try {
        await gcalCallbackHandler(req, res);
    } catch (e) {
        res.status(500).send("Server Error");
    }
});

const gcalEventsHandler = require('./api/gcal-events');
app.get('/api/gcal-events', async (req, res) => {
    try {
        await gcalEventsHandler(req, res);
    } catch (e) {
        res.status(500).send("Server Error");
    }
});

const gcalWebhookHandler = require('./api/gcal-webhook');
app.post('/api/gcal-webhook', async (req, res) => {
    try {
        await gcalWebhookHandler(req, res);
    } catch (e) {
        res.status(500).send("Server Error");
    }
});

const cronHandler = require('./api/cron');
app.get('/api/cron', async (req, res) => {
    try {
        await cronHandler(req, res);
    } catch (e) {
        res.status(500).send("Server Error");
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`
    🚀 Server running on http://localhost:${PORT}
    
    - Frontend: http://localhost:${PORT}/index.html
    - Admin:    http://localhost:${PORT}/admin.html
    - API:      http://localhost:${PORT}/api/email
    `);
});

setInterval(() => {
    // Keep alive
}, 60000);