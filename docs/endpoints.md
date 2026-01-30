---
title: API Endpoints
layout: default
---

# API Endpoints

**Base URL:** `https://athletic-live-scraper-transponder.onrender.com/`

All endpoints except `/health` require a valid API key. Provide it in one of these ways:

- **Header:** `X-API-Key: <your-key>`
- **Query (GET):** `?api_key=<your-key>`
- **Body (POST):** `{ "api_key": "<your-key>" }`

Missing or invalid keys return `401 Unauthorized`.

---

## GET /events

Returns the list of events for a meet page (non-finished, reordered).

**Query parameters**

| Name | Type   | Required | Description                          |
|------|--------|----------|--------------------------------------|
| `url` | string | Yes      | Full URL of the meet/events page.     |
| `api_key` | string | Yes*     | API key (if not sent via header).     |

**Example**

```
GET https://athletic-live-scraper-transponder.onrender.com/events?url=https://armorytrack.live/meets/54971/events&api_key=YOUR_KEY
```

**Success (200)**

```json
{
  "events": [
    {
      "name": "Boys 4x800mR",
      "group": "Varsity",
      "phase": "Live",
      "inField": false,
      "finished": false
    }
  ]
}
```

---

## POST /events

Same as GET /events; parameters are sent in the JSON body.

**Body**

| Name | Type   | Required | Description                          |
|------|--------|----------|--------------------------------------|
| `url` | string | Yes      | Full URL of the meet/events page.     |
| `api_key` | string | Yes*     | API key (if not sent via header).     |

**Example**

```json
POST https://athletic-live-scraper-transponder.onrender.com/events
Content-Type: application/json

{
  "url": "https://armorytrack.live/meets/54971/events",
  "api_key": "YOUR_KEY"
}
```

**Success (200)** — Same shape as GET /events.

---

## GET /num-events-before

Returns how many events appear before a given event (matched by both name and group) in the meet’s event list.

**Query parameters**

| Name        | Type   | Required | Description                                                    |
|-------------|--------|----------|----------------------------------------------------------------|
| `url`       | string | Yes      | Full URL of the meet/events page.                             |
| `eventName` | string | Yes      | Event name to find (e.g. `Girls 4x400mR`).                     |
| `group`     | string | Yes      | Event group (e.g. `Varsity`, `Novice Prelims`, `Freshmen`).    |
| `api_key`   | string | Yes*     | API key (if not sent via header).                             |

**Example**

```
GET https://athletic-live-scraper-transponder.onrender.com/num-events-before?url=https://armorytrack.live/meets/54971/events&eventName=Girls%204x400mR&group=Varsity&api_key=YOUR_KEY
```

**Success (200)**

```json
{
  "numEventsBefore": 5
}
```

If the event is not found, `numEventsBefore` is `-1`.

---

## POST /num-events-before

Same as GET /num-events-before; parameters are sent in the JSON body.

**Body**

| Name        | Type   | Required | Description                                                    |
|-------------|--------|----------|----------------------------------------------------------------|
| `url`       | string | Yes      | Full URL of the meet/events page.                             |
| `eventName` | string | Yes      | Event name to find (e.g. `Girls 4x400mR`).                     |
| `group`     | string | Yes      | Event group (e.g. `Varsity`, `Novice Prelims`, `Freshmen`).   |
| `api_key`   | string | Yes*     | API key (if not sent via header).                             |

**Example**

```json
POST https://athletic-live-scraper-transponder.onrender.com/num-events-before
Content-Type: application/json

{
  "url": "https://armorytrack.live/meets/54971/events",
  "eventName": "Girls 4x400mR",
  "group": "Varsity",
  "api_key": "YOUR_KEY"
}
```

**Success (200)** — Same shape as GET /num-events-before.

---

## GET /health

No authentication. Use for health checks (e.g. Render).

**Example:** `GET https://athletic-live-scraper-transponder.onrender.com/health`

**Success (200)**

```json
{
  "ok": true
}
```

---

## Invalid link and no events

**Invalid link** (bad URL, 404, timeout, or page never loads):

| Endpoint             | Status | Response |
|----------------------|--------|----------|
| GET/POST `/events`   | **500** | `{ "error": "Failed to fetch events.", "message": "<Puppeteer/error message>" }` |
| GET/POST `/num-events-before` | **500** | `{ "error": "Failed to compute num events before.", "message": "<Puppeteer/error message>" }` |

**No events** (page loads but no events are found, or all are filtered out):

| Endpoint             | Status | Response |
|----------------------|--------|----------|
| GET/POST `/events`   | **200** | `{ "events": [] }` |
| GET/POST `/num-events-before` | **200** | `{ "numEventsBefore": -1 }` (no matching event in the list) |

---

## Error responses

| Status | Meaning |
|--------|--------|
| **400** | Missing or invalid `url`, `eventName`, or `group`. |
| **401** | Invalid or missing API key. |
| **500** | Server error (e.g. fetch or scrape failed). Body includes `error` and optionally `message`. |
| **503** | Server has no API key configured. |

Error body shape:

```json
{
  "error": "Short description",
  "message": "Optional detail (e.g. on 500)"
}
```
