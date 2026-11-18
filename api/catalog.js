const { json, readCache, writeCache } = require('./_lib/data');

const value = input => String(input || '').trim();
const slug = input => value(input).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
  const make = value(req.query.make);
  const year = value(req.query.year);
  if (!make || !/^\d{4}$/.test(year)) return json(res, 400, { error: 'make and year are required' });
  const cacheKey = `catalog:${year}:${slug(make)}`;
  try {
    const cached = await readCache(cacheKey);
    if (cached) return json(res, 200, { ...cached.payload, cache: 'hit' });
  } catch (_) {}
  const url = `https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeYear/make/${encodeURIComponent(make)}/modelyear/${year}?format=json`;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error('Vehicle catalogue request failed');
    const data = await response.json();
    const payload = { make, year, models: [...new Set((data.Results || []).map(item => item.Model_Name).filter(Boolean))], source: 'NHTSA vPIC' };
    await writeCache({
      cache_key: cacheKey, year: Number(year), make, model: '*', source: 'NHTSA vPIC', payload,
      fetched_at: new Date().toISOString(), expires_at: new Date(Date.now() + 180 * 86400000).toISOString()
    }).catch(() => {});
    return json(res, 200, { ...payload, cache: 'miss' });
  } catch (error) {
    return json(res, 502, { error: error.message });
  }
};
