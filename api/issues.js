const { json, currentUser, getProviderKey, readCache, writeCache } = require('./_lib/data');

const value = input => String(input || '').trim();
const slug = input => value(input).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const identity = input => value(input).toLowerCase().replace(/[^a-z0-9]/g, '');

function providerMatches(requestedMake, requestedModel, data) {
  const providerMake = data?.model?.makeEn || data?.model?.make || '';
  const providerModel = data?.model?.modelEn || data?.model?.model || '';
  return identity(providerMake) === identity(requestedMake) && identity(providerModel) === identity(requestedModel);
}

async function nhtsa(kind, year, make, model) {
  const url = new URL(`https://api.nhtsa.gov/${kind}/${kind}ByVehicle`);
  Object.entries({ make, model, modelYear: year }).forEach(([key, item]) => url.searchParams.set(key, item));
  const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (response.status === 404) return [];
  if (!response.ok) throw new Error('NHTSA request failed');
  const data = await response.json();
  return data.results || [];
}

async function carsxeRecalls(year, make, model, key) {
  if (!key) return null;
  const url = new URL('https://api.carsxe.com/v1/recalls-ymm');
  Object.entries({ year, make, model, key }).forEach(([name, item]) => url.searchParams.set(name, item));
  const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
  const data = await response.json().catch(() => ({}));
  if (response.status === 404) return [];
  if (!response.ok || data.success === false) throw new Error('CarsXE recall request failed');
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
  'コンピュータ': 'Control module', '(ファン)ベルト': 'Auxiliary belt', '配線': 'Wiring',
  'シートベルト': 'Seat belts', '無段変速機': 'Continuously variable transmission (CVT)', 'ドア': 'Doors'
};

const englishDevice = name => {
  const raw = value(name).normalize('NFKC');
  if (raw.startsWith('コンピュータ(エンジ')) return 'Engine control module';
  if (raw.startsWith('その他')) return raw.includes('エンジン') ? 'Engine' : 'Other systems';
  return jpDeviceNames[raw] || jpDeviceNames[name] || 'Vehicle system';
};

Object.assign(jpDeviceNames, {
  '\u30b9\u30d7\u30ea\u30f3\u30b0/\u30a8\u30a2\u30b5\u30b9': 'Suspension springs / air suspension',
  '\u30d6\u30ec\u30fc\u30ad': 'Brakes',
  '\u30b9\u30c6\u30a2\u30ea\u30f3\u30b0': 'Steering'
});

// English summaries of the MLIT filing text, keyed by notification number.
const englishFilings = {
  '1149200': {
    parts: 'Engine control module software',
    problem: 'The software can allow too little air into the engine while the vehicle is stopped in Drive. Idle speed may drop and the engine may stall.',
    action: 'Reprogram the engine control module with the updated software.'
  },
  '1148730': {
    parts: 'Front seat belts and center-pillar trim',
    problem: 'A front seat belt may be pinched behind the center-pillar trim, leaving slack that can delay restraint and increase the risk of injury in a crash.',
    action: 'Inspect the front seat belts and correct the installation if there is slack.'
  },
  '1151890': {
    parts: 'CVT steel belt and controller software',
    problem: 'The CVT belt may slip under heavy load and produce debris that disrupts hydraulic pressure. The vehicle may lose the ability to drive.',
    action: 'Update the CVT controller software and replace the CVT if inspection confirms belt slip. If slip is confirmed later on a vehicle whose CVT was retained, the filing provides for free replacement.'
  },
  '1151520': {
    parts: 'Front door latches and strikers',
    problem: 'In a side impact, side-airbag deployment can deform a front door latch. The latch may disengage and let the door open.',
    action: 'Replace the front door latches and strikers with updated parts.'
  },
  '1148440': {
    parts: 'Fuel-vapor hose, vent pipe, and pressure control valve',
    problem: 'A sticking pressure valve can deform the fuel tank and make the gauge read too high. The engine can stall after running out of fuel without the low-fuel light coming on.',
    action: 'Replace the fuel-vapor hose and vent pipe with updated parts.'
  }
};

function guidanceFor(component) {
  const name = String(component || '').toLowerCase();
  if (name.includes('fuel hose') || name.includes('fuel pipe')) return { parts: 'Fuel-vapour hose, vent pipe and pressure-control valve', problem: 'A restricted or defective vent can distort tank pressure and make the fuel reading unreliable.', symptoms: 'Incorrect fuel gauge, fuel smell, stalling or unexpected fuel exhaustion.', action: 'Inspect the venting circuit and replace the campaign-listed hose or valve parts if the chassis is eligible.' };
  if (name.includes('fuel tank') || name.includes('fuel system')) return { parts: 'Fuel tank, pump seal, hoses and vapour-control components', problem: 'A seal, tank moulding or vapour-control fault may allow leakage or incorrect tank pressure.', symptoms: 'Fuel smell, visible leakage, inaccurate gauge or stalling.', action: 'Pressure-test and inspect the tank and seals; replace only the confirmed defective or recalled part.' };
  if (name.includes('engine')) return { parts: 'Engine control, crank pulley/bolt and related sensors', problem: 'A fastening, sensor or control fault may interrupt correct engine timing or operation.', symptoms: 'Warning light, rough running, loss of power, stalling or failure to restart.', action: 'Scan fault codes, inspect the listed engine components and verify the campaign number before replacement.' };
  if (name.includes('transmission') || name.includes('driveline')) return { parts: 'Transmission actuator, oil-pump motor and driveline components', problem: 'Wear or an actuator fault may prevent a gear change or power transfer.', symptoms: 'Gear warning, delayed engagement, abnormal noise or inability to move.', action: 'Check diagnostic codes, actuator operation and fluid condition before deciding whether repair or replacement is required.' };
  if (name.includes('driveshaft')) return { parts: 'Driveshaft, hub nut, CV joint and dust boot', problem: 'A loose fastener or damaged boot can create play, grease loss and eventual driveline failure.', symptoms: 'Clicking, vibration, grease around the wheel or excessive hub play.', action: 'Inspect torque, joint play and boot condition; replace only damaged or campaign-listed parts.' };
  if (name.includes('airbag') || name.includes('occupant')) return { parts: 'Airbag controller, inflator, curtain bag and seat-belt pretensioner', problem: 'A controller or airbag assembly fault may prevent correct deployment in a collision.', symptoms: 'Airbag warning light; often no other driving symptom.', action: 'Treat as safety-critical and have the campaign checked by an authorised dealer.' };
  if (name.includes('brake')) return { parts: 'Brake actuator, hydraulic circuit, pads, discs and sensors', problem: 'Hydraulic, actuator or wear-related faults can reduce braking performance.', symptoms: 'Warning light, noise, vibration, soft pedal or increased stopping distance.', action: 'Measure and inspect the braking system before replacing parts; stop driving if braking feels unsafe.' };
  if (name.includes('steering')) return { parts: 'Steering gear, joints and mounting hardware', problem: 'Wear, looseness or an assembly defect can affect steering response.', symptoms: 'Play, knocking, heavy steering or the car wandering.', action: 'Inspect steering play and mounting torque immediately; replace the confirmed worn or recalled component.' };
  if (name.includes('suspension')) return { parts: 'Springs, struts, arms, bushes and mounting hardware', problem: 'Wear, corrosion or loose mounting hardware can affect wheel control.', symptoms: 'Clunks, uneven ride height, vibration or unstable handling.', action: 'Inspect both sides for play, corrosion and damage before replacing paired wear components.' };
  if (name.includes('lighting')) return { parts: 'Headlamps, rear lamps, switches, wiring and control modules', problem: 'A lamp, wiring or control fault may cause intermittent or failed safety lighting.', symptoms: 'Warning message, flickering or one or more lamps not working.', action: 'Test power, ground, connectors and the lamp assembly before replacing a module.' };
  if (name.includes('electrical') || name.includes('control module') || name.includes('wiring')) return { parts: 'Wiring, connectors, battery/charging circuit and control modules', problem: 'Connection, moisture or module faults can cause intermittent electrical operation.', symptoms: 'Warning lights, no-start, battery drain or accessories restarting.', action: 'Test battery and charging voltage, then inspect connectors and scan modules before replacement.' };
  if (name.includes('body') || name.includes('chassis')) return { parts: 'Body structure, latches, mounts and corrosion-prone areas', problem: 'Corrosion, looseness or a latch defect may affect structural or closure security.', symptoms: 'Rattles, difficult closure, visible corrosion or unusual movement.', action: 'Inspect the named body area and mounting points; repair corrosion or replace the confirmed failed part.' };
  return { parts: component || 'Related vehicle components', problem: 'The reports point to a possible fault in this system, but do not identify one confirmed part.', symptoms: 'Symptoms vary by the exact component and vehicle configuration.', action: 'Inspect and test the system before approving replacement parts.' };
}

async function japanModelRecords(year, make, model) {
  const base = 'https://databutler.dev/api/vehicles/jp';
  const query = new URLSearchParams({ make, model });
  const [recallResponse, complaintResponse] = await Promise.all([
    fetch(`${base}/recalls?${query}`, { signal: AbortSignal.timeout(12000) }),
    fetch(`${base}/complaints?${query}`, { signal: AbortSignal.timeout(12000) })
  ]);
  if ([recallResponse, complaintResponse].some(response => !response.ok && response.status !== 404)) {
    throw new Error('Japan public records request failed');
  }
  const recallData = recallResponse.ok ? await recallResponse.json() : {};
  const complaintData = complaintResponse.ok ? await complaintResponse.json() : {};
  const recallMatch = providerMatches(make, model, recallData);
  const complaintMatch = providerMatches(make, model, complaintData);
  const selectedYear = Number(year);
  const recalls = (recallMatch ? recallData.recalls : []) || [];
  const filteredRecalls = recalls
    .filter(item => Math.abs(Number(String(item.date || '').slice(0, 4)) - selectedYear) <= 5)
    .sort((a, b) => Math.abs(Number(String(a.date).slice(0, 4)) - selectedYear) - Math.abs(Number(String(b.date).slice(0, 4)) - selectedYear))
    .slice(0, 5)
    .map(item => {
      const component = englishDevice(item.device);
      const filing = englishFilings[item.notificationNo];
      const guidance = filing || guidanceFor(component);
      return {
      Component: component,
      NHTSACampaignNumber: `JP ${item.notificationNo}`,
      Summary: `Official Japan MLIT campaign filed ${item.date}. This is a model-line match; verify the chassis number before assuming this vehicle is affected.`,
      Consequence: guidance.problem,
      Remedy: guidance.action,
      AffectedParts: guidance.parts,
      Symptoms: guidance.symptoms || null,
      EnglishFilingSummary: Boolean(filing),
      OriginalSituation: item.situation || null,
      OriginalRemedy: item.measures || null,
      OriginalComponent: item.device || null,
      SourceUrl: item.officialPdf || recallData.cite?.url || null
    };
    });
  const patterns = (complaintMatch ? (complaintData.complaints?.byDevice || []) : []).slice(0, 6).map(item => {
    const component = englishDevice(item.device);
    const guidance = guidanceFor(component);
    return {
    title: `${component} reports`,
    category: 'Japan owner reports',
    count: item.count,
    share: item.share,
    summary: `${item.count} of ${complaintData.complaints.sampledForBreakdown || complaintData.complaints.total} sampled ${model} reports involved this system (${item.share}%). Reports are not confirmed defects and are not adjusted for sales volume.`,
    affectedParts: guidance.parts,
    possibleProblem: guidance.problem,
    symptoms: guidance.symptoms,
    typicalAction: guidance.action,
    originalComponent: item.device || null
  };
  });
  return {
    recalls: filteredRecalls,
    patterns,
    sourceUrl: (recallMatch && recallData.cite?.url) || (complaintMatch && complaintData.cite?.url) || 'https://renrakuda.mlit.go.jp/',
    verifiedDate: (recallMatch && recallData.verifiedDate) || (complaintMatch && complaintData.verifiedDate) || null
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
  const year = value(req.query.year);
  const make = value(req.query.make);
  const model = value(req.query.model);
  if (!/^\d{4}$/.test(year) || !make || !model) return json(res, 400, { error: 'year, make and model are required' });
  const providerScope = process.env.CARSXE_API_KEY || req.headers.authorization ? 'provider' : 'public';
  const cacheKey = `issues:v6:${providerScope}:${year}:${slug(make)}:${slug(model)}`;
  try {
    const cached = await readCache(cacheKey);
    if (cached) return json(res, 200, { ...cached.payload, cache: 'hit', expiresAt: cached.expires_at });
  } catch (_) {}

  const user = await currentUser(req).catch(() => null);
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
  const sources = [];
  if (publicRecalls.value || complaints.value) sources.push('NHTSA');
  if (providerRecalls.value) sources.push('CarsXE');
  if (japanRecords.value?.recalls?.length || japanRecords.value?.patterns?.length) sources.push('Japan MLIT');
  const payload = {
    recalls: [...recalls.values()],
    complaints: complaints.value || [],
    patterns: japanRecords.value?.patterns || [],
    reached: Boolean(publicRecalls.value || complaints.value || providerRecalls.value || japanRecords.value),
    sources,
    sourceUrl: japanRecords.value?.sourceUrl || null,
    verifiedDate: japanRecords.value?.verifiedDate || null,
    fetchedAt: new Date().toISOString()
  };
  if (!payload.reached) return json(res, 502, { error: 'Public safety data is temporarily unavailable' });
  const partial = [publicRecalls, complaints, providerRecalls, japanRecords].some(result => result.status === 'rejected');
  const expiresAt = new Date(Date.now() + (partial ? 3600000 : 7 * 86400000)).toISOString();
  await writeCache({
    cache_key: cacheKey, year: Number(year), make, model, source: payload.sources.join('+'), payload,
    fetched_at: new Date().toISOString(), expires_at: expiresAt
  }).catch(() => {});
  return json(res, 200, { ...payload, cache: 'miss', expiresAt });
};
