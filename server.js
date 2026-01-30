/**
 * server.js — API server for get_events and num_events_before.
 * Protected by API key (env API_KEY or api_key.txt). Runs on Render.
 */

import express from 'express';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getEventListElements } from './get_events.js';
import { numEventsBefore } from './num_events_before.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// On Render: set API_KEY in Environment. Locally: use api_key.txt (ignored by git).
function getApiKey() {
  if (process.env.API_KEY) return process.env.API_KEY.trim();
  const path = join(__dirname, 'api_key.txt');
  if (existsSync(path)) return readFileSync(path, 'utf8').trim();
  return null;
}

const API_KEY = getApiKey();

const app = express();
app.use(express.json());

function requireApiKey(req, res, next) {
  const key = req.headers['x-api-key'] ?? req.query?.api_key ?? req.body?.api_key;
  if (!API_KEY) {
    return res.status(503).json({ error: 'Server has no API key configured.' });
  }
  if (!key || key !== API_KEY) {
    return res.status(401).json({ error: 'Invalid or missing API key.' });
  }
  next();
}

app.get('/events', requireApiKey, async (req, res) => {
  const url = req.query.url;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid url.' });
  }
  try {
    const events = await getEventListElements(url);
    res.json({ events });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch events.', message: err.message });
  }
});

app.post('/events', requireApiKey, async (req, res) => {
  const url = req.body?.url;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid url.' });
  }
  try {
    const events = await getEventListElements(url);
    res.json({ events });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch events.', message: err.message });
  }
});

app.get('/num-events-before', requireApiKey, async (req, res) => {
  const url = req.query.url;
  const eventName = req.query.eventName;
  const group = req.query.group;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid url.' });
  }
  if (!eventName || typeof eventName !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid eventName.' });
  }
  if (!group || typeof group !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid group.' });
  }
  try {
    const numEventsBeforeCount = await numEventsBefore(url, eventName, group);
    res.json({ numEventsBefore: numEventsBeforeCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to compute num events before.', message: err.message });
  }
});

app.post('/num-events-before', requireApiKey, async (req, res) => {
  const url = req.body?.url;
  const eventName = req.body?.eventName;
  const group = req.body?.group;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid url.' });
  }
  if (!eventName || typeof eventName !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid eventName.' });
  }
  if (!group || typeof group !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid group.' });
  }
  try {
    const numEventsBeforeCount = await numEventsBefore(url, eventName, group);
    res.json({ numEventsBefore: numEventsBeforeCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to compute num events before.', message: err.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
