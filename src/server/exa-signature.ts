import { createHmac, timingSafeEqual } from 'node:crypto'

export const REPLAY_TOLERANCE_MS = 5 * 60 * 1000

/**
 * Verify an Exa webhook delivery, as described in the Exa Monitors docs:
 * header `Exa-Signature: t=<timestamp>,v1=<hex>`, where v1 = HMAC-SHA256(secret, "<timestamp>.<raw body>").
 */
export function verifyExaSignature(
  rawBody: string,
  header: string | undefined,
  secret: string,
  now = Date.now(),
): boolean {
  if (!header) return false
  const parts = new Map<string, string>()
  for (const part of header.split(',')) {
    const i = part.indexOf('=')
    if (i > 0) parts.set(part.slice(0, i).trim(), part.slice(i + 1).trim())
  }
  const timestamp = parts.get('t')
  const signature = parts.get('v1')
  if (!timestamp || !signature || !/^[0-9a-f]+$/i.test(signature)) return false
  // Replay protection: a captured delivery stops being accepted after a few minutes.
  // Exa's docs do not state the unit of `t`, so accept seconds or milliseconds.
  const t = Number(timestamp)
  if (!Number.isFinite(t)) return false
  const sentAt = t > 1e12 ? t : t * 1000
  if (Math.abs(now - sentAt) > REPLAY_TOLERANCE_MS) return false
  const expected = createHmac('sha256', secret).update(`${timestamp}.`).update(rawBody).digest()
  const actual = Buffer.from(signature, 'hex')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

/** Build a valid header for a body. Used by the smoke test and for local replay. */
export function signExaPayload(rawBody: string, secret: string, timestamp = Math.floor(Date.now() / 1000)): string {
  const v1 = createHmac('sha256', secret).update(`${timestamp}.`).update(rawBody).digest('hex')
  return `t=${timestamp},v1=${v1}`
}
