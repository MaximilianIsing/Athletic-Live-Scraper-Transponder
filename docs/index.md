---
title: Athletic Live API
layout: default
---

# Athletic Live API

API for track meet event data: fetch event lists and count how many events appear before a given event.

## Quick links

- **[API Endpoints](endpoints.html)** — Full reference for all endpoints, auth, and examples.

## Overview

- **Events** — Get the list of (non-finished, reordered) events for a meet page.
- **Num events before** — Get how many events appear before a specific event name.
- All protected endpoints require an API key (header `X-API-Key`, query `api_key`, or JSON body).

## Health check

`GET /health` returns `{ "ok": true }` and does not require authentication.
