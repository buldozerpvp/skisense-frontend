/**
 * Where the frontend gets its prices.
 *
 * By default it calls its own route handlers under /api/prices, which read
 * MongoDB Atlas (see app/api/prices). That's what makes a Vercel deploy work
 * without exposing the collector machine to the internet. Those handlers fall
 * back to proxying the local NestJS backend on :3000 when no connection string
 * is configured, so local development needs no setup either.
 *
 * Set NEXT_PUBLIC_API_BASE_URL to point the browser straight at a backend
 * instead — e.g. "http://192.168.1.20:3000" to use a backend on the LAN.
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

/** Paths on API_BASE_URL. The route handlers mirror the NestJS controller. */
export const PRICES_ENDPOINTS = API_BASE_URL
  ? ({
      latest: "/prices/fetch-latest-offers",
      all: "/prices/fetch-all-offers",
    } as const)
  : ({
      latest: "/api/prices/latest",
      all: "/api/prices/all",
    } as const);
