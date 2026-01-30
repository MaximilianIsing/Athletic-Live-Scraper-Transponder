/**
 * get_events.js — Track meet event scraper
 */

import puppeteer from 'puppeteer';

const LIST_SELECTOR = 'div.list-group';

// Group: Varsity/Novice/Freshmen/Freshman with optional Prelims/Finals, or standalone Prelims/Finals.
// Longer alternatives first so "Varsity Finals" matches before "Varsity".
const GROUP_PATTERN = /^\s*(.+?)\s+((?:Varsity\s+Finals|Varsity\s+Prelims|Varsity|Novice\s+Finals|Novice\s+Prelims|Novice|Freshmen\s+Finals|Freshmen\s+Prelims|Freshmen|Freshman\s+Finals|Freshman\s+Prelims|Freshman|Prelims|Finals))\s+(.+)$/i;
// When there's no group (e.g. "Men Hept 60m        Results"), parse name + phase only.
const FALLBACK_PHASE_PATTERN = /^\s*(.+?)\s{2,}(Start Lists|Entries|Results|Done|Unofficial|Official|Live)\s*$/i;
// Strip clock times and optional time zones so they don't break name/phase parsing (e.g. "5:30 PM", "6:45 PM EST").
const TIME_PATTERN = /\d{1,2}:\d{2}\s*(?:AM|PM)?\s*(?:EST|EDT|CST|CDT|MST|MDT|PST|PDT|ET|CT|MT|PT|UTC)?/gi;

const IN_FIELD_PREFIXES = [
  'Boys 55', 'Girls 55', 'Men 55', 'Women 55',
  'Boys 60', 'Girls 60', 'Men 60', 'Women 60',
];

const FIELD_EVENT_KEYWORDS = [
  'Jump', 'High', 'Vault', 'Put', 'Shot', 'Throw', 'Triple', 'Long', "Weight"
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
  const trimmed = text.trim();
  // Remove clock times so they don't break phase extraction (e.g. "Boys 55mH  5:30 PM   Prelims Official").
  const textWithoutTimes = trimmed.replace(TIME_PATTERN, '').replace(/\s{2,}/g, '  ').trim();
  const m = textWithoutTimes.match(GROUP_PATTERN);
  let name, rawPhase;
  if (m) {
    name = m[1].trim();
    rawPhase = m[3].trim();
  } else {
    const fallback = textWithoutTimes.match(FALLBACK_PHASE_PATTERN);
    if (fallback) {
      name = fallback[1].trim();
      rawPhase = fallback[2].trim();
    } else {
      name = textWithoutTimes;
      rawPhase = '';
    }
  }
  const inField = isInField(name);
  const phase = stripLeadingNumbersFromPhase(rawPhase);
  const finished = FINISHED_PHASES.includes(phase);
  if (!m) {
    return { name, group: 'None', phase, inField, finished };
  }
  return {
    name,
    group: m[2] || 'None',
    phase,
    inField,
    finished,
  };
}

/**
 * Normalizes a meet URL to the /events page.
 * - /meets/60867 → /meets/60867/events
 * - /meets/60867/follow → /meets/60867/events
 * - /meets/60867/events/individual/2227014 → /meets/60867/events
 * @param {string} urlString - Any meet page URL
 * @returns {string} URL that ends with /events
 */
function normalizeEventsUrl(urlString) {
  let url;
  try {
    url = new URL(urlString);
  } catch {
    return urlString;
  }
  const match = url.pathname.match(/\/meets\/([^/]+)/);
  if (!match) return urlString;
  const meetId = match[1];
  const eventsPath = `/meets/${meetId}/events`;
  return `${url.origin}${eventsPath}`;
}

/**
 * Fetches the page at the given URL and returns the meet title (og:title) and all events with name, group, and phase.
 * @param {string} url - Meet page URL (will be normalized to /events if needed)
 * @returns {Promise<{ events: Array<{ name: string, group: string, phase: string, inField: boolean, finished: boolean }>, title: string|null }>}
 */
/** Launch options for Puppeteer (headless Chrome on Render/Linux). Reduces memory use. */
function getLaunchOptions() {
  return {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--disable-background-networking',
      '--disable-default-apps',
      '--disable-sync',
      '--no-first-run',
      '--disable-extensions',
      '--mute-audio',
    ],
  };
}

const SCRAPE_TIMEOUT_MS = 60_000;

export async function getEventListElements(url) {
  const eventsUrl = normalizeEventsUrl(url);
  let browser;
  let page;
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error('Scrape timeout')),
      SCRAPE_TIMEOUT_MS
    );
  });

  try {
    browser = await puppeteer.launch(getLaunchOptions());
    page = await browser.newPage();

    const work = (async () => {
      await page.goto(eventsUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await page.waitForSelector(LIST_SELECTOR, { timeout: 15000 });

      const raw = await page.evaluate((selector) => {
        const containers = Array.from(document.querySelectorAll(selector));
        if (containers.length === 0) return [];

        // Prefer the list inside app-event-sidebar; else use the one with the most children (events list).
        const inSidebar = containers.find((el) => el.closest('app-event-sidebar') !== null);
        const container = inSidebar ?? containers.reduce((best, el) =>
          (el.children.length > (best?.children.length ?? 0) ? el : best)
        );
        if (!container) return [];

        return Array.from(container.children).map((el) =>
          (el.textContent ?? '').trim()
        );
      }, LIST_SELECTOR);

      const events = raw.map(parseEventText).filter((event) => !isFieldEvent(event.name));
      const reordered = reorderInFieldEvents(events);
      const filtered = reordered.filter((ev) => !ev.finished);
      const title = await page.evaluate(() => {
        const m = document.querySelector('meta[property="og:title"]');
        return m ? (m.getAttribute('content') || '').trim() || null : null;
      });
      return { events: filtered, title };
    })();

    return await Promise.race([work, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    try {
      if (page) await page.close();
    } catch (_) {}
    try {
      if (browser) await browser.close();
    } catch (_) {}
  }
}
