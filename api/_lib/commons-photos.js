const commons = 'https://commons.wikimedia.org/w/api.php';
const normalize = value => value.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const terms = value => ` ${normalize(value)} `;
const separateModels = /^(?:cross|crossback|sportback|sport turismo|gran coupe|alltrack|allroad|verso|spacio|axio|fielder|rumion|prime|smile|stingray|custom z|mach e|type r)\b/;

function matchingTitle(title, { year, make, model, trim }) {
  const name = title.replace(/^File:/i, '').replace(/\.[^.]+$/, '');
  const prefix = /^(\d{4})(?:\s*[-–—]\s*(\d{4}|\d{2}))?[ _]+(.+)$/u.exec(name);
  const suffix = prefix ? null : /^(.+?)\s+\((\d{4})\)(?:\s+\(\d{8,}\))?$/u.exec(name);
  if (!prefix && !suffix) return null;
  const start = prefix?.[1] || suffix[2];
  const end = prefix?.[2] || start;
  const description = prefix?.[3] || suffix[1];
  const last = Number(end.length === 2 ? start.slice(0, 2) + end : end);
  if (Number(year) < Number(start) || Number(year) > last || last - Number(start) > 12) return null;

  const identity = normalize(`${make} ${model}`);
  const text = normalize(description);
  if (text !== identity && !text.startsWith(`${identity} `)) return null;
  const variant = text.slice(identity.length).trim();
  const separateModel = variant.match(separateModels)?.[0];
  if (separateModel && !terms(trim || '').includes(terms(separateModel))) return null;
  if (trim && !terms(variant).includes(terms(trim))) return null;
  if (/\b(?:interior|cockpit|dashboard|engine bay|engine compartment|instrument cluster|steering wheel|undercarriage|wheel close up|logo|badge|brochure|crash|wreck|scale model|diecast|prototype|replica|concept)\b/.test(variant)) return null;
  const score = (start === year && last === Number(year) ? 8 : 0)
    + (/\bfront\b/.test(variant) ? 4 : 0) - (/\brear\b/.test(variant) ? 2 : 0);
  return { name, score };
}

const plainText = value => String(value || '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").trim();

async function searchCommons(vehicle, indexedYear, signal) {
  const { make, model, trim } = vehicle;
  const identity = normalize(`${make} ${model}`);
  const search = `intitle:"${identity}" intitle:${indexedYear}${trim ? ` intitle:"${normalize(trim)}"` : ''}`;
  const params = new URLSearchParams({
    action: 'query', generator: 'search', gsrsearch: search, gsrnamespace: '6', gsrlimit: '25',
    prop: 'imageinfo', iiprop: 'url|mime|extmetadata', iiurlwidth: '640',
    iiextmetadatafilter: 'Artist|LicenseShortName|LicenseUrl', format: 'json', formatversion: '2'
  });
  const response = await fetch(`${commons}?${params}`, {
    headers: { 'User-Agent': 'AutoLookup/1.0 (https://github.com/kentuckyfb/auto-lookup)' },
    signal
  });
  if (!response.ok) throw new Error('Wikimedia Commons image search failed');
  const body = await response.json();
  if (body.error) throw new Error('Wikimedia Commons image search failed');
  const candidates = [];
  for (const page of body.query?.pages || []) {
    const match = matchingTitle(page.title, vehicle);
    const info = page.imageinfo?.[0];
    const license = info?.extmetadata?.LicenseShortName?.value || '';
    const artist = plainText(info?.extmetadata?.Artist?.value).slice(0, 200);
    const attributed = /^CC BY(?:-SA)? [1-4]\.\d$/i.test(license);
    if (!match || !info?.thumburl || !/^image\/(jpeg|png|webp)$/.test(info.mime)) continue;
    if (attributed ? !artist : !/^(?:CC0(?: 1\.0)?|Public domain)$/i.test(license)) continue;
    const thumbnail = new URL(info.thumburl);
    thumbnail.search = '';
    candidates.push({ score: match.score, image: {
      url: thumbnail.href,
      sourceUrl: info.descriptionurl,
      title: match.name,
      artist,
      license,
      licenseUrl: info.extmetadata?.LicenseUrl?.value || null,
      credit: 'Wikimedia Commons'
    } });
  }
  return candidates;
}

async function commonsPhotos(vehicle) {
  const signal = AbortSignal.timeout(9500);
  const exact = await searchCommons(vehicle, vehicle.year, signal);
  let candidates = exact;
  if (!candidates.length) {
    const earlier = [1, 2, 3].map(offset => searchCommons(vehicle, Number(vehicle.year) - offset, signal));
    const results = await Promise.allSettled(earlier);
    candidates = results.flatMap(result => result.value || []);
  }
  candidates.sort((a, b) => b.score - a.score);
  return [...new Map(candidates.map(({ image }) => [image.url, image])).values()].slice(0, 6);
}

module.exports = { commonsPhotos };
