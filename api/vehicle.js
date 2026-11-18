const { json, currentUser, getProviderKey, readCache, writeCache } = require('./_lib/data');

const clean = value => String(value || '').trim();
const slug = value => clean(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

async function carsxe(path, params, key) {
  const url = new URL(`https://api.carsxe.com${path}`);
  Object.entries({ ...params, key }).forEach(([name, value]) => value != null && url.searchParams.set(name, value));
  const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.success === false) throw new Error(body.message || `CarsXE request failed (${response.status})`);
  return body;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
  const year = clean(req.query.year);
  const make = clean(req.query.make);
  const model = clean(req.query.model);
  if (!/^\d{4}$/.test(year) || !make || !model) return json(res, 400, { error: 'year, make and model are required' });

  const cacheKey = `vehicle:${year}:${slug(make)}:${slug(model)}`;
  try {
    const cached = await readCache(cacheKey);
    if (cached) return json(res, 200, { ...cached.payload, cache: 'hit', source: cached.source });
  } catch (_) { /* The provider can still serve the request if the cache is unavailable. */ }

  const user = await currentUser(req);
  let key = null;
  let keySource = 'global';
  try {
    key = await getProviderKey(user?.id);
    if (key) keySource = 'user';
  } catch (_) { /* Fall through to the global key. */ }
  key ||= process.env.CARSXE_API_KEY;
  if (!key) return json(res, 503, { error: 'Vehicle provider is not configured', code: 'PROVIDER_NOT_CONFIGURED' });

  try {
    const [specResult, imageResult] = await Promise.allSettled([
      carsxe('/v1/ymm', { year, make, model, exact_match: 'true', allTrimOptions: '1' }, key),
      carsxe('/images', { year, make, model, transparent: 'false', validate: 'true', size: 'Large', license: 'ModifyCommercially' }, key)
    ]);
    if (specResult.status === 'rejected' && imageResult.status === 'rejected') throw specResult.reason;
    const spec = specResult.status === 'fulfilled' ? specResult.value : null;
    const imagePayload = imageResult.status === 'fulfilled' ? imageResult.value : null;
    const images = (imagePayload?.images || []).slice(0, 6).map(image => ({
      url: image.link,
      thumbnailUrl: image.thumbnailLink || null,
      sourceUrl: image.contextLink || null,
      width: image.width || null,
      height: image.height || null,
      mime: image.mime || null,
      licenseFilter: 'ModifyCommercially'
    }));
    const payload = {
      vehicle: { year, make, model, match: spec?.bestMatch || null, trims: spec?.trimOptions || [] },
      images,
      provider: 'carsxe',
      providerKey: keySource,
      fetchedAt: new Date().toISOString()
    };
    await writeCache({
      cache_key: cacheKey,
      year: Number(year), make, model,
      source: 'carsxe', payload,
      fetched_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 86400000).toISOString()
    }).catch(() => {});
    return json(res, 200, { ...payload, cache: 'miss' });
  } catch (error) {
    return json(res, 502, { error: error.message || 'Vehicle provider request failed' });
  }
};
