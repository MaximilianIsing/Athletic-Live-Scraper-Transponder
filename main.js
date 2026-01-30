/**
 * Local test: same as test-server.js GET /events but runs getEventListElements directly.
 * Run: node main.js
 */

import { getEventListElements } from './get_events.js';

const MEET_URL = 'https://armorytrack.live/meets/54971';

async function main() {
  console.log('Testing locally (getEventListElements)');
  console.log('Meet URL:', MEET_URL);

  console.log('\n--- GET /events (local) ---');
  try {
    const events = await getEventListElements(MEET_URL);
    console.log('Status: ok');
    console.log('Response:', JSON.stringify({ events }, null, 2));
    console.log('Count:', events.length);
  } catch (err) {
    console.error('Error:', err.message);
    throw err;
  }

  console.log('\nDone.');
}

main();
