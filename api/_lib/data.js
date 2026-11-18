const crypto = require('node:crypto');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function databaseReady() {
  return Boolean(SUPABASE_URL && SERVICE_KEY);
}

async function supabase(path, options = {}) {
  if (!databaseReady()) throw new Error('Database is not configured');
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  if (!response.ok) throw new Error(`Database request failed (${response.status})`);
  if (response.status === 204) return null;
  return response.json();
}

async function currentUser(req) {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token || !SUPABASE_URL || !ANON_KEY) return null;
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` }
  });
  return response.ok ? response.json() : null;
}

function encryptionKey() {
  const raw = process.env.CREDENTIAL_ENCRYPTION_KEY || '';
  if (!raw) throw new Error('Credential encryption is not configured');
  return crypto.createHash('sha256').update(raw).digest();
}

function encrypt(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, ciphertext].map(part => part.toString('base64url')).join('.');
}

function decrypt(value) {
  const [iv, tag, ciphertext] = String(value).split('.').map(part => Buffer.from(part, 'base64url'));
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

async function getProviderKey(userId, provider = 'carsxe') {
  if (!userId || !databaseReady()) return null;
  const rows = await supabase(`provider_connections?select=encrypted_key&user_id=eq.${encodeURIComponent(userId)}&provider=eq.${provider}&limit=1`);
  return rows?.[0]?.encrypted_key ? decrypt(rows[0].encrypted_key) : null;
}

async function readCache(cacheKey) {
  if (!databaseReady()) return null;
  const rows = await supabase(`vehicle_cache?select=payload,source,expires_at&cache_key=eq.${encodeURIComponent(cacheKey)}&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&limit=1`);
  return rows?.[0] || null;
}

async function writeCache(record) {
  if (!databaseReady()) return;
  await supabase('vehicle_cache?on_conflict=cache_key', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(record)
  });
}

module.exports = { json, databaseReady, supabase, currentUser, encrypt, getProviderKey, readCache, writeCache };
