/**
 * num_events_before.js — Returns how many events appear before a given event.
 */

import { getEventListElements } from './get_events.js';

/**
 * Fetches the event list from the given URL and returns the number of events
 * that appear before the first event whose name and group match.
 * @param {string} url - Link to the meet/event page
 * @param {string} eventName - The specific event name to find (e.g. "Boys 55mH", "Girls 4x400mR")
 * @param {string} group - The event group (e.g. "Varsity", "Novice Prelims", "Freshmen")
 * @returns {Promise<number>} The number of events before that event, or -1 if not found
 */
export async function numEventsBefore(url, eventName, group) {
  const events = await getEventListElements(url);
  const index = events.findIndex(
    (ev) => ev.name === eventName && ev.group === group
  );
  return index === -1 ? -1 : index;
}
