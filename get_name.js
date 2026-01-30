/**
 * get_name.js — Reads the meet title from the og:title meta tag.
 */

import puppeteer from 'puppeteer';

function normalizeMeetUrl(urlString) {
  let url;
  try {
    url = new URL(urlString);
  } catch {
    return urlString;
  }
  const match = url.pathname.match(/\/meets\/([^/]+)/);
  if (!match) return urlString;
  const meetId = match[1];
  return `${url.origin}/meets/${meetId}/events`;
}

function getLaunchOptions() {
  return {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-software-rasterizer',
    ],
  };
}

/**
 * Extracts the content value from the og:title meta tag in the HTML.
 */
function extractOgTitle(html) {
  const idx = html.indexOf('og:title');
  if (idx === -1) return null;
  const afterOg = html.slice(idx);
  const contentMatch = afterOg.match(/content\s*=\s*["']([^"']*)["']/);
  return contentMatch ? contentMatch[1].trim() || null : null;
}

/**
 * Loads the meet page, gets the HTML, and returns the og:title meta content.
 * @param {string} url - Any meet page URL
 * @returns {Promise<string|null>} The meet title, or null if not found
 */
export async function getMeetName(url) {
  const pageUrl = normalizeMeetUrl(url);
  const browser = await puppeteer.launch(getLaunchOptions());
  try {
    const page = await browser.newPage();
    await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 2000));
    const html = await page.content();
    const title = extractOgTitle(html);
    return title || null;
  } finally {
    await browser.close();
  }
}
