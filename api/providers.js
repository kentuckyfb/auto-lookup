const { json, currentUser, supabase, encrypt } = require('./_lib/data');

async function validateCarsxe(key) {
  const url = new URL('https://api.carsxe.com/v1/ymm-options');
  url.searchParams.set('dimension', 'years');
  url.searchParams.set('key', key);
  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.success === false) throw new Error(body.message || 'CarsXE rejected this key');
}

async function validateOpenAI(key) {
  const response = await fetch('https://api.openai.com/v1/models', {
    headers: { Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(10000)
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error?.message || 'OpenAI rejected this key');
}

const providers = {
  carsxe: { label: 'CarsXE', validate: validateCarsxe },
  openai: { label: 'OpenAI', validate: validateOpenAI }
};

module.exports = async function handler(req, res) {
  const user = await currentUser(req);
  if (!user) return json(res, 401, { error: 'Sign in required' });
  if (req.method === 'GET') {
    const rows = await supabase(`provider_connections?select=provider,key_hint,verified_at&user_id=eq.${encodeURIComponent(user.id)}`);
    return json(res, 200, { connections: rows || [] });
  }
  if (req.method === 'POST') {
    const provider = String(req.body?.provider || 'carsxe').toLowerCase();
    const config = providers[provider];
    if (!config) return json(res, 400, { error: 'Unsupported provider' });
    const key = String(req.body?.key || '').trim();
    if (key.length < 12) return json(res, 400, { error: `Enter a valid ${config.label} key` });
    try { await config.validate(key); } catch (error) { return json(res, 400, { error: error.message }); }
    await supabase('provider_connections?on_conflict=user_id,provider', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({
        user_id: user.id,
        provider,
        encrypted_key: encrypt(key),
        key_hint: key.slice(-4),
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    });
    return json(res, 200, { provider, key_hint: key.slice(-4) });
  }
  if (req.method === 'DELETE') {
    const provider = String(req.query?.provider || 'carsxe').toLowerCase();
    if (!providers[provider]) return json(res, 400, { error: 'Unsupported provider' });
    await supabase(`provider_connections?user_id=eq.${encodeURIComponent(user.id)}&provider=eq.${provider}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
    return json(res, 200, { removed: true });
  }
  return json(res, 405, { error: 'Method not allowed' });
};
