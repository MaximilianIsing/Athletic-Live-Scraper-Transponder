import { getEventListElements } from './get_events.js';
import { numEventsBefore } from './num_events_before.js';

const url = 'https://armorytrack.live/meets/54971/events';

const elements = await getEventListElements(url);
console.log('Event list elements:', JSON.stringify(elements, null, 2));
console.log('Count:', elements.length);

const numBefore = await numEventsBefore(url, 'Girls 4x400mR');
console.log('Events before Girls 4x400mR:', numBefore);
