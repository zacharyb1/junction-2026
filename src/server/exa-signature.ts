import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Verify an Exa webhook delivery, as described in the Exa Monitors docs:
 * header `Exa-Signature: t=<timestamp>,v1=<hex>`, where v1 = HMAC-SHA256(secret, "<timestamp>.<raw body>").
 */
export function verifyExaSignature(rawBody: string, header: string | undefined, secret: string): boolean {
  if (!header) return false
  const parts = new Map<string, string>()
  for (const part of header.split(',')) {
    const i = part.indexOf('=')
    if (i > 0) parts.set(part.slice(0, i).trim(), part.slice(i + 1).trim())
  }
  const timestamp = parts.get('t')
  const signature = parts.get('v1')
  if (!timestamp || !signature || !/^[0-9a-f]+$/i.test(signature)) return false
  const expected = createHmac('sha256', secret).update(`${timestamp}.`).update(rawBody).digest()
  const actual = Buffer.from(signature, 'hex')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

/** Build a valid header for a body. Used by the smoke test and for local replay. */
export function signExaPayload(rawBody: string, secret: string, timestamp = Math.floor(Date.now() / 1000)): string {
  const v1 = createHmac('sha256', secret).update(`${timestamp}.`).update(rawBody).digest('hex')
  return `t=${timestamp},v1=${v1}`
}
