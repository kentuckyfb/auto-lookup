const { json, readCache, writeCache } = require('./_lib/data');
const { commonsPhotos } = require('./_lib/commons-photos');

const clean = value => String(value || '').trim();
const slug = value => clean(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

async function carsxe(path, params, key) {
  const url = new URL(`https://api.carsxe.com${path}`);
  Object.entries({ ...params, key }).forEach(([name, value]) => value != null && url.searchParams.set(name, value));
  const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
  const body = await response.json().catch(() => ({}));
  if (response.status === 404) return null;
  if (!response.ok || body.success === false) throw new Error(body.message || `CarsXE request failed (${response.status})`);
  return body;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
  const year = clean(req.query.year);
  const make = clean(req.query.make);
  const model = clean(req.query.model);
  const trim = clean(req.query.trim);
  const photoOnly = req.query.photoOnly === '1';
  if (!/^\d{4}$/.test(year) || !slug(make) || !slug(model) || [make, model, trim].some(value => value.length > 100)) {
    return json(res, 400, { error: 'A valid year, make and model are required' });
  }

  const canUseCarsxe = Boolean(process.env.CARSXE_API_KEY);
  const cacheKey = `vehicle:v2:${photoOnly ? 'photo' : 'details'}:${canUseCarsxe ? 'provider' : 'public'}:${year}:${slug(make)}:${slug(model)}:${encodeURIComponent(trim.toLowerCase())}`;
  try {
    const cached = await readCache(cacheKey);
    if (cached) return json(res, 200, { ...cached.payload, cache: 'hit', source: cached.source, expiresAt: cached.expires_at });
  } catch (_) { /* The provider can still serve the request if the cache is unavailable. */ }

  const key = process.env.CARSXE_API_KEY;
  const keySource = 'global';

  try {
    const variant = trim ? { trim } : {};
    const [specResult, imageResult] = await Promise.allSettled([
      key && !photoOnly ? carsxe('/v1/ymm', { year, make, model, ...variant, exact_match: 'true', allTrimOptions: '1' }, key) : null,
      key ? carsxe('/images', {
        year, make, model, ...variant, ...(trim ? { photoType: 'exterior' } : {}),
        transparent: 'false', validate: 'true', angle: 'front', license: 'ModifyCommercially'
      }, key) : null
    ]);
    const spec = specResult.value;
    let images = (imageResult.value?.images || []).filter(image => /^https:\/\//i.test(image.link || '')).slice(0, 6).map(image => ({
      url: image.link,
      thumbnailUrl: image.thumbnailLink || null,
      sourceUrl: image.contextLink || null,
      width: image.width || null,
      height: image.height || null,
      mime: image.mime || null,
      licenseFilter: 'ModifyCommercially',
      credit: 'CarsXE'
    }));
    let source = images.length ? 'carsxe' : null;
    if (!images.length) {
      try {
        images = await commonsPhotos({ year, make, model, trim });
        if (images.length) source = 'wikimedia';
      } catch (error) {
        if (!spec) throw error;
      }
    }
    if (!images.length && !spec && imageResult.status === 'rejected') throw imageResult.reason;
    const ttl = images.length && (!canUseCarsxe || source === 'carsxe') ? 30 * 86400000 : 3600000;
    const expiresAt = new Date(Date.now() + ttl).toISOString();
    const payload = {
      vehicle: { year, make, model, trim, match: spec?.bestMatch || null, trims: spec?.trimOptions || [] },
      images,
      provider: source || (spec ? 'carsxe' : null),
      ...(source === 'carsxe' || spec ? { providerKey: keySource } : {}),
      fetchedAt: new Date().toISOString()
    };
    await writeCache({
      cache_key: cacheKey,
      year: Number(year), make, model,
      source: payload.provider || 'none', payload,
      fetched_at: new Date().toISOString(),
      expires_at: expiresAt
    }).catch(() => {});
    return json(res, 200, { ...payload, cache: 'miss', expiresAt });
  } catch (error) {
    return json(res, 502, { error: error.message || 'Vehicle provider request failed' });
  }
};
