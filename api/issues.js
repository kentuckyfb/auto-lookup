const { json, currentUser, getProviderKey, readCache, writeCache } = require('./_lib/data');

const value = input => String(input || '').trim();
const slug = input => value(input).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

async function nhtsa(kind, year, make, model) {
  const url = new URL(`https://api.nhtsa.gov/${kind}/${kind}ByVehicle`);
  Object.entries({ make, model, modelYear: year }).forEach(([key, item]) => url.searchParams.set(key, item));
  const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error('NHTSA request failed');
  const data = await response.json();
  return data.results || [];
}

async function carsxeRecalls(year, make, model, key) {
  if (!key) return [];
  const url = new URL('https://api.carsxe.com/v1/recalls-ymm');
  Object.entries({ year, make, model, key }).forEach(([name, item]) => url.searchParams.set(name, item));
  const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) return [];
  return (data.data?.recalls || []).map(recall => ({
    Component: recall.component,
    NHTSACampaignNumber: recall.nhtsa_campaign_number,
    Summary: recall.summary,
    Consequence: recall.consequence,
    Remedy: recall.remedy
  }));
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
  const year = value(req.query.year);
  const make = value(req.query.make);
  const model = value(req.query.model);
  if (!/^\d{4}$/.test(year) || !make || !model) return json(res, 400, { error: 'year, make and model are required' });
  const cacheKey = `issues:${year}:${slug(make)}:${slug(model)}`;
  try {
    const cached = await readCache(cacheKey);
    if (cached) return json(res, 200, { ...cached.payload, cache: 'hit' });
  } catch (_) {}

  const user = await currentUser(req);
  let providerKey = null;
  try { providerKey = await getProviderKey(user?.id); } catch (_) {}
  providerKey ||= process.env.CARSXE_API_KEY;
  const [publicRecalls, complaints, providerRecalls] = await Promise.allSettled([
    nhtsa('recalls', year, make, model),
    nhtsa('complaints', year, make, model),
    carsxeRecalls(year, make, model, providerKey)
  ]);
  const recalls = new Map();
  for (const recall of [...(publicRecalls.value || []), ...(providerRecalls.value || [])]) {
    recalls.set(recall.NHTSACampaignNumber || recall.nhtsaCampaignNumber || JSON.stringify(recall), recall);
  }
  const payload = {
    recalls: [...recalls.values()],
    complaints: complaints.value || [],
    reached: [publicRecalls, complaints, providerRecalls].some(result => result.status === 'fulfilled'),
    sources: providerKey ? ['NHTSA', 'CarsXE'] : ['NHTSA'],
    fetchedAt: new Date().toISOString()
  };
  await writeCache({
    cache_key: cacheKey, year: Number(year), make, model, source: payload.sources.join('+'), payload,
    fetched_at: new Date().toISOString(), expires_at: new Date(Date.now() + 7 * 86400000).toISOString()
  }).catch(() => {});
  return json(res, 200, { ...payload, cache: 'miss' });
};
