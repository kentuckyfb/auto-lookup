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

const jpDeviceNames = {
  'エンジン': 'Engine', '動力伝達': 'Transmission / driveline', '保安灯火': 'Lighting',
  '制動装置': 'Brakes', 'かじ取り': 'Steering', '車枠・車体': 'Body / chassis',
  '乗車装置': 'Occupant equipment', '緩衝装置': 'Suspension', '電気装置': 'Electrical',
  '燃料装置': 'Fuel system', '走行装置': 'Running gear', '排ｶﾞｽ･騒音': 'Emissions / noise',
  'Ａ／Ｔ': 'Transmission', 'ドライブシャフト': 'Driveshaft', 'エアーバッグ': 'Airbag',
  '燃料ホース/パイプ': 'Fuel hose / pipe', 'エンジン一般': 'Engine', '燃料タンク': 'Fuel tank',
  'コンピュータ': 'Control module', '(ファン)ベルト': 'Auxiliary belt', '配線': 'Wiring'
};

const englishDevice = name => jpDeviceNames[name] || name || 'Vehicle system';

async function japanModelRecords(year, make, model) {
  const base = 'https://databutler.dev/api/vehicles/jp';
  const query = new URLSearchParams({ make, model });
  const [recallResponse, complaintResponse] = await Promise.all([
    fetch(`${base}/recalls?${query}`, { signal: AbortSignal.timeout(12000) }),
    fetch(`${base}/complaints?${query}`, { signal: AbortSignal.timeout(12000) })
  ]);
  if (!recallResponse.ok && !complaintResponse.ok) return { recalls: [], patterns: [], sourceUrl: null };
  const recallData = recallResponse.ok ? await recallResponse.json() : {};
  const complaintData = complaintResponse.ok ? await complaintResponse.json() : {};
  const selectedYear = Number(year);
  const recalls = (recallData.recalls || [])
    .filter(item => Math.abs(Number(String(item.date || '').slice(0, 4)) - selectedYear) <= 5)
    .sort((a, b) => Math.abs(Number(String(a.date).slice(0, 4)) - selectedYear) - Math.abs(Number(String(b.date).slice(0, 4)) - selectedYear))
    .slice(0, 5)
    .map(item => ({
      Component: englishDevice(item.device),
      NHTSACampaignNumber: `JP ${item.notificationNo}`,
      Summary: `Official Japan MLIT campaign filed ${item.date}. This is a model-line match; verify the chassis number before assuming this vehicle is affected.`,
      Consequence: `The campaign concerns the ${englishDevice(item.device).toLowerCase()}. Ask an authorised dealer to check campaign ${item.notificationNo} against the chassis number.`,
      Remedy: 'If the chassis is included, follow the inspection or replacement action in the official campaign notice.',
      SourceUrl: item.officialPdf || recallData.cite?.url || null
    }));
  const patterns = (complaintData.complaints?.byDevice || []).slice(0, 6).map(item => ({
    title: `${englishDevice(item.device)} reports`,
    category: 'Japan owner reports',
    count: item.count,
    share: item.share,
    summary: `${item.count} of ${complaintData.complaints.sampledForBreakdown || complaintData.complaints.total} sampled Alto reports involved this system (${item.share}%). Reports are not confirmed defects and are not adjusted for sales volume.`
  }));
  return {
    recalls,
    patterns,
    sourceUrl: recallData.cite?.url || complaintData.cite?.url || 'https://renrakuda.mlit.go.jp/',
    verifiedDate: recallData.verifiedDate || complaintData.verifiedDate || null
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
  const year = value(req.query.year);
  const make = value(req.query.make);
  const model = value(req.query.model);
  if (!/^\d{4}$/.test(year) || !make || !model) return json(res, 400, { error: 'year, make and model are required' });
  const cacheKey = `issues:v2:${year}:${slug(make)}:${slug(model)}`;
  try {
    const cached = await readCache(cacheKey);
    if (cached) return json(res, 200, { ...cached.payload, cache: 'hit' });
  } catch (_) {}

  const user = await currentUser(req);
  let providerKey = null;
  try { providerKey = await getProviderKey(user?.id); } catch (_) {}
  providerKey ||= process.env.CARSXE_API_KEY;
  const [publicRecalls, complaints, providerRecalls, japanRecords] = await Promise.allSettled([
    nhtsa('recalls', year, make, model),
    nhtsa('complaints', year, make, model),
    carsxeRecalls(year, make, model, providerKey),
    japanModelRecords(year, make, model)
  ]);
  const recalls = new Map();
  for (const recall of [...(publicRecalls.value || []), ...(providerRecalls.value || []), ...(japanRecords.value?.recalls || [])]) {
    recalls.set(recall.NHTSACampaignNumber || recall.nhtsaCampaignNumber || JSON.stringify(recall), recall);
  }
  const sources = ['NHTSA'];
  if (providerKey) sources.push('CarsXE');
  if (japanRecords.value?.recalls?.length || japanRecords.value?.patterns?.length) sources.push('Japan MLIT');
  const payload = {
    recalls: [...recalls.values()],
    complaints: complaints.value || [],
    patterns: japanRecords.value?.patterns || [],
    reached: [publicRecalls, complaints, providerRecalls, japanRecords].some(result => result.status === 'fulfilled'),
    sources,
    sourceUrl: japanRecords.value?.sourceUrl || null,
    verifiedDate: japanRecords.value?.verifiedDate || null,
    fetchedAt: new Date().toISOString()
  };
  await writeCache({
    cache_key: cacheKey, year: Number(year), make, model, source: payload.sources.join('+'), payload,
    fetched_at: new Date().toISOString(), expires_at: new Date(Date.now() + 7 * 86400000).toISOString()
  }).catch(() => {});
  return json(res, 200, { ...payload, cache: 'miss' });
};
