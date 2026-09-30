const enc = new TextEncoder()
const dec = new TextDecoder()

async function getKey() {
  const secret = process.env.TOKEN_ENCRYPTION_KEY || process.env.ADMIN_SESSION_SECRET
  if (!secret) throw new Error('TOKEN_ENCRYPTION_KEY is not configured')
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(secret))
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

function b64(bytes: Uint8Array) {
  return Buffer.from(bytes).toString('base64url')
}
function unb64(value: string) {
  return new Uint8Array(Buffer.from(value, 'base64url'))
}

export async function encryptSecret(value?: string | null) {
  if (!value) return null
  const key = await getKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(value)))
  return `${b64(iv)}.${b64(cipher)}`
}

export async function decryptSecret(value?: string | null) {
  if (!value) return null
  const [ivPart, cipherPart] = value.split('.')
  if (!ivPart || !cipherPart) throw new Error('Invalid encrypted value')
  const key = await getKey()
  const clear = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(ivPart) }, key, unb64(cipherPart))
  return dec.decode(clear)
}
