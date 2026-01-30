/**
 * get_events.js — Track meet event scraper
 */

import puppeteer from 'puppeteer';

const LIST_SELECTOR = 'div.list-group';

const GROUP_PATTERN = /^\s*(.+?)\s+((?:Varsity|Novice|Freshmen)(?:\s+(?:Prelims|Finals))?)\s+(.+)$/;

const IN_FIELD_PREFIXES = [
  'Boys 55', 'Girls 55', 'Men 55', 'Women 55',
  'Boys 60', 'Girls 60', 'Men 60', 'Women 60',
];

const FIELD_EVENT_KEYWORDS = [
  'Jump', 'High', 'Vault', 'Put', 'Shot', 'Throw', 'Triple', 'Long',
];

function isInField(name) {
  return IN_FIELD_PREFIXES.some((prefix) => name.startsWith(prefix));
}

function isFieldEvent(name) {
  return FIELD_EVENT_KEYWORDS.some((keyword) => name.includes(keyword));
}

const FINISHED_PHASES = ['Results', 'Done', 'Unofficial', 'Official'];

function isEventFinished(event) {
  return FINISHED_PHASES.includes(event.phase);
}

/**
 * If the ordering of the extracted event list indicates that an event has been
 * finished below an event that has not been finished, do the reordering for
 * in-field events: move those finished events to the beginning (in their
 * existing order) and remove them from their previous positions.
 * Detection: scan from end of list to beginning; if we ever see finished then
 * not finished, there is a problem.
 * @param {Array<{ name: string, group: string, phase: string, inField: boolean, finished: boolean }>} events
 * @returns {Array<{ name: string, group: string, phase: string, inField: boolean, finished: boolean }>}
 */
function reorderInFieldEvents(events) {
  let seenFinished = false;
  let minUnfinishedWithFinishedBelow = Infinity;
  for (let i = events.length - 1; i >= 0; i--) {
    const ev = events[i];
    if (ev.finished) seenFinished = true;
    else if (seenFinished) minUnfinishedWithFinishedBelow = Math.min(minUnfinishedWithFinishedBelow, i);
  }

  if (minUnfinishedWithFinishedBelow === Infinity) {
    console.log('No finished-event-below-unfinished detected; no reordering.');
    return events;
  }

  const outOfOrderIndices = new Set();
  const outOfOrderEvents = [];
  events.forEach((ev, i) => {
    if (ev.inField && ev.finished && i > minUnfinishedWithFinishedBelow) {
      outOfOrderIndices.add(i);
      outOfOrderEvents.push(ev);
    }
  });

  if (outOfOrderEvents.length === 0) {
    console.log('No finished-event-below-unfinished detected; no reordering.');
    return events;
  }

  console.log(
    'Detected finished event(s) below unfinished event(s); reordering in-field events.'
  );

  const rest = events.filter((_, i) => !outOfOrderIndices.has(i));
  return [...outOfOrderEvents, ...rest];
}

/**
 * Parses raw event text into name, group, phase, inField, and finished.
 * Phase is everything after the group (Varsity, Novice, Freshmen).
 * inField is true for 55m/60m track events (Boys/Girls/Men/Women 55 or 60).
 * finished is true when phase is Results, Done, Unofficial, or Official.
 * @param {string} text
 * @returns {{ name: string, group: string, phase: string, inField: boolean, finished: boolean }}
 */
function stripLeadingNumbersFromPhase(phase) {
  return phase.replace(/^\d+[.\s]*/, '').trim();
}

function parseEventText(text) {
  const m = text.trim().match(GROUP_PATTERN);
  const name = m ? m[1].trim() : text.trim();
  const inField = isInField(name);
  const rawPhase = m ? m[3].trim() : '';
  const phase = stripLeadingNumbersFromPhase(rawPhase);
  const finished = FINISHED_PHASES.includes(phase);
  if (!m) {
    return { name, group: '', phase: '', inField, finished };
  }
  return {
    name,
    group: m[2],
    phase,
    inField,
    finished,
  };
}

/**
 * Fetches the page at the given URL and returns all events with name, group, and phase.
 * @param {string} url - Meet page URL
 * @returns {Promise<Array<{ name: string, group: string, phase: string, inField: boolean, finished: boolean }>>}
 */
export async function getEventListElements(url) {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector(LIST_SELECTOR, { timeout: 15000 });

    const raw = await page.evaluate((selector) => {
      const containers = document.querySelectorAll(selector);
      const container = Array.from(containers).find(
        (el) => el.closest('app-event-sidebar') !== null
      ) ?? Array.from(containers).sort(
        (a, b) => b.children.length - a.children.length
      )[0];
      if (!container) return [];

      return Array.from(container.children).map((el) =>
        (el.textContent ?? '').trim()
      );
    }, LIST_SELECTOR);

    const events = raw.map(parseEventText).filter((event) => !isFieldEvent(event.name));
    const reordered = reorderInFieldEvents(events);
    return reordered.filter((ev) => !ev.finished);
  } finally {
    await browser.close();
  }
}
