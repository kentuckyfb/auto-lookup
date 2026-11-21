const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const vehicles = {
  "Acura": [["Integra","compact"],["TLX","sedan"],["RDX","suv"],["MDX","suv"],["NSX","sport"]],
  "Alfa Romeo": [["Giulia","sedan"],["Stelvio","suv"],["Tonale","suv"],["4C","sport"]],
  "Audi": [["A3","sedan"],["A4","sedan"],["A6","sedan"],["Q3","suv"],["Q5","suv"],["Q7","suv"],["TT","coupe"]],
  "BMW": [["2 Series","coupe"],["3 Series","sedan"],["5 Series","sedan"],["7 Series","luxury"],["X1","suv"],["X3","suv"],["X5","suv"],["Z4","coupe"]],
  "Buick": [["Regal","sedan"],["Encore","suv"],["Envision","suv"],["Enclave","suv"]],
  "Cadillac": [["CT4","sedan"],["CT5","sedan"],["XT4","suv"],["XT5","suv"],["Escalade","luxury"]],
  "Chevrolet": [["Camaro","coupe"],["Corvette Stingray","sport"],["Malibu","sedan"],["Equinox","suv"],["Tahoe","suv"],["Silverado","truck"]],
  "Dodge": [["Challenger","coupe"],["Charger","sedan"],["Durango","suv"],["Hornet","suv"],["Ram 1500","truck"]],
  "Ferrari": [["Roma","sport"],["296 GTB","sport"],["SF90 Stradale","sport"],["Purosangue","suv"]],
  "Ford": [["Fiesta","compact"],["Focus","compact"],["Mustang","sport"],["Escape","suv"],["Explorer","suv"],["F-150","truck"]],
  "Genesis": [["G70","sedan"],["G80","luxury"],["G90","luxury"],["GV60","suv"],["GV70","suv"],["GV80","suv"]],
  "Honda": [["Civic","sedan"],["Accord","sedan"],["Fit","compact"],["HR-V","suv"],["CR-V","suv"],["Pilot","suv"]],
  "Hyundai": [["Elantra","sedan"],["Sonata","sedan"],["Kona","suv"],["Tucson","suv"],["Santa Fe","suv"],["Ioniq 5","suv"]],
  "Jeep": [["Renegade","suv"],["Compass","suv"],["Wrangler","suv"],["Cherokee","suv"],["Grand Cherokee","suv"]],
  "Kia": [["Rio","compact"],["K5","sedan"],["Soul","compact"],["Sportage","suv"],["Sorento","suv"],["EV6","sport"]],
  "Lamborghini": [["Huracán","sport"],["Revuelto","sport"],["Urus","suv"]],
  "Land Rover": [["Discovery Sport","suv"],["Defender","suv"],["Range Rover Evoque","suv"],["Range Rover Sport","suv"],["Range Rover","luxury"]],
  "Lexus": [["IS","sedan"],["ES","sedan"],["LS","luxury"],["UX","suv"],["NX","suv"],["RX","suv"]],
  "Mazda": [["Mazda3","sedan"],["Mazda6","sedan"],["MX-5 Miata","sport"],["CX-30","suv"],["CX-5","suv"],["CX-90","suv"]],
  "Mercedes-Benz": [["A-Class","compact"],["C-Class","sedan"],["E-Class","sedan"],["S-Class","luxury"],["GLA","suv"],["GLC","suv"],["GLE","suv"],["AMG GT","sport"]],
  "MINI": [["Cooper 3-Door","compact"],["Cooper 5-Door","compact"],["Cooper Convertible","compact"],["Clubman","compact"],["Countryman","suv"]],
  "Mitsubishi": [["Mirage","compact"],["Lancer","sedan"],["Eclipse Cross","suv"],["Outlander Sport","suv"],["Outlander","suv"]],
  "Nissan": [["Versa","sedan"],["Sentra","sedan"],["Altima","sedan"],["Z","sport"],["Kicks","suv"],["Rogue","suv"],["Pathfinder","suv"]],
  "Porsche": [["718 Cayman","sport"],["911","sport"],["Panamera","luxury"],["Macan","suv"],["Cayenne","suv"],["Taycan","sport"]],
  "Rolls-Royce": [["Ghost","luxury"],["Phantom","luxury"],["Wraith","coupe"],["Dawn","coupe"],["Cullinan","suv"],["Spectre","coupe"]],
  "Subaru": [["Impreza","compact"],["Legacy","sedan"],["BRZ","sport"],["Crosstrek","suv"],["Forester","suv"],["Outback","suv"]],
  "Suzuki": [["Alto","compact"],["Celerio","compact"],["Swift","compact"],["Wagon R","compact"],["Baleno","compact"],["Dzire","sedan"],["Ignis","compact"],["Jimny","suv"],["S-Cross","suv"],["Vitara","suv"],["Grand Vitara","suv"],["Ertiga","suv"],["Fronx","suv"]],
  "Tesla": [["Model 3","sedan"],["Model S","luxury"],["Model Y","suv"],["Model X","suv"],["Cybertruck","truck"]],
  "Toyota": [["Corolla","sedan"],["Camry","sedan"],["Prius","compact"],["GR86","sport"],["Supra","sport"],["RAV4","suv"],["Highlander","suv"],["Land Cruiser","suv"],["Tacoma","truck"]],
  "Volkswagen": [["Polo","compact"],["Golf","compact"],["Jetta","sedan"],["Passat","sedan"],["T-Roc","suv"],["Tiguan","suv"],["ID.4","suv"]],
  "Volvo": [["S60","sedan"],["S90","luxury"],["V60","sedan"],["XC40","suv"],["XC60","suv"],["XC90","suv"]]
};

const colors = { sport:["#8f302e","#d65c48"], coupe:["#3d5267","#8aa1b0"], compact:["#345d55","#75a294"], suv:["#4a5256","#8b989b"], truck:["#384b58","#758c99"], luxury:["#23292f","#626d75"], sedan:["#30485e","#7894a8"] };
const shapes = {
  sport:"M38 139 C70 116 129 111 184 107 L240 64 C274 43 346 44 383 68 L426 108 C458 112 478 123 486 140 L480 164 H28 Z",
  coupe:"M38 139 C70 112 127 106 183 103 L238 55 C273 35 348 37 386 64 L430 106 C460 112 478 124 486 140 L480 164 H28 Z",
  compact:"M42 137 C70 111 117 101 169 100 L205 55 C232 34 322 34 350 57 L397 103 C443 106 473 120 484 141 L478 164 H30 Z",
  suv:"M35 137 C57 109 102 99 155 96 L188 40 C209 24 350 24 377 43 L420 99 C454 104 476 121 486 141 L480 164 H27 Z",
  truck:"M29 139 C49 112 89 102 139 99 L166 51 C188 34 275 34 298 52 L326 103 H409 L438 116 C462 122 480 134 486 145 L480 164 H25 Z",
  luxury:"M31 139 C58 112 111 104 173 101 L218 48 C245 29 358 29 386 51 L428 104 C462 109 480 125 487 142 L480 164 H25 Z",
  sedan:"M35 139 C61 112 114 105 173 101 L215 55 C243 36 350 36 382 58 L426 105 C459 110 479 124 486 141 L480 164 H28 Z"
};

const searchInput = $('#vehicle-search');
const yearSelect = $('#vehicle-model-year');
const suggestions = $('#vehicle-suggestions');
const catalog = Object.entries(vehicles).flatMap(([make, models]) =>
  models.map(([model, type]) => ({ make, model, type, label: `${make} ${model}` }))
);
const catalogByYear = new Map();
const historyKey = 'auto_lookup_recent_searches';
const recentSearchLimit = 5;
let recentSearches = lookupCache.read(historyKey, []).slice(0, recentSearchLimit);
const savedVehiclesKey = 'auto_lookup_saved_vehicles';
let savedVehicles = lookupCache.read(savedVehiclesKey, []);
let matches = [];
let activeIndex = -1;
let selectedVehicle = null;

const normalize = value => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const vehicleKey = ({ year, make, model, trim }) => JSON.stringify([year, normalize(make), normalize(model), (trim || '').toLowerCase()]);
const vehicleTitle = ({ year, label, trim }) => `${year} ${label}${trim ? ` · ${trim}` : ''}`;
const vehicleRecord = ({ year, make, model, type, label, trim = '' }) => ({ year, make, model, type, label, trim });

const latestYear = Math.max(new Date().getFullYear() + 1, ...[...recentSearches, ...savedVehicles].map(vehicle => Number(vehicle.year)));
const modelYears = [];
for (let year = latestYear; year >= 1886; year--) modelYears.push(new Option(year, year));
yearSelect.append(...modelYears);

function renderRecentSearches() {
  const container = $('#recent-searches');
  container.replaceChildren();
  container.classList.toggle('hidden', !recentSearches.length);
  for (const vehicle of recentSearches) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = vehicleTitle(vehicle);
    button.addEventListener('click', () => chooseVehicle(vehicle));
    container.appendChild(button);
  }
}

function isVehicleSaved(vehicle) {
  const key = vehicleKey(vehicle);
  return savedVehicles.some(item => vehicleKey(item) === key);
}

function updateSaveButton() {
  const saved = Boolean(selectedVehicle && isVehicleSaved(selectedVehicle));
  const button = $('#save-vehicle');
  button.setAttribute('aria-pressed', String(saved));
  button.title = saved ? 'Remove from saved vehicles' : 'Save to profile';
}

function renderSavedVehicles() {
  const list = $('#saved-vehicles');
  list.replaceChildren();
  $('#saved-vehicles-empty').classList.toggle('hidden', Boolean(savedVehicles.length));

  for (const [index, vehicle] of savedVehicles.entries()) {
    const row = document.createElement('li');
    row.className = 'saved-vehicle-row';
    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'saved-vehicle-open';
    open.textContent = vehicleTitle(vehicle);
    open.addEventListener('click', () => chooseVehicle(vehicle));

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'saved-vehicle-remove text-button';
    remove.textContent = 'Remove';
    remove.setAttribute('aria-label', `Remove ${vehicleTitle(vehicle)}`);
    remove.addEventListener('click', () => {
      removeSavedVehicle(vehicle);
      const remaining = list.querySelectorAll('.saved-vehicle-remove');
      (remaining[index] || remaining[index - 1] || $('#saved-vehicles-heading')).focus();
    });

    row.append(open, remove);
    list.appendChild(row);
  }
}

function storeSavedVehicles(vehicles) {
  savedVehicles = vehicles;
  lookupCache.write(savedVehiclesKey, vehicles);
  renderSavedVehicles();
  updateSaveButton();
}

function removeSavedVehicle(vehicle) {
  const key = vehicleKey(vehicle);
  storeSavedVehicles(savedVehicles.filter(item => vehicleKey(item) !== key));
}

async function lookupJson(url, token) {
  const response = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {}, signal: AbortSignal.timeout(28000) });
  if (!response.ok) throw new Error('Vehicle lookup failed');
  return response.json();
}

function findMatches(value) {
  const year = yearSelect.value;
  const words = normalize(value).split(' ').filter(Boolean);
  if (!words.length) return [];
  const yearCatalog = [...catalog, ...[...(catalogByYear.get(year)?.values() || [])].flat()];
  return yearCatalog.map(vehicle => {
    const aliases = vehicle.model.includes('Stingray') ? ' stringray vette' : vehicle.make === 'MINI' ? ' mini cooper' : '';
    const haystack = normalize(vehicle.label + aliases);
    const hits = words.filter(word => haystack.includes(word));
    const starts = words.filter(word => haystack.split(' ').some(part => part.startsWith(word))).length;
    return { ...vehicle, year, score: hits.length * 10 + starts * 2 - haystack.length / 100 };
  }).filter(vehicle => vehicle.score >= words.length * 10).sort((a, b) => b.score - a.score || a.label.localeCompare(b.label)).slice(0, 8);
}

function renderSuggestions() {
  const previousScroll = suggestions.scrollTop;
  suggestions.innerHTML = '';
  matches = findMatches(searchInput.value);
  if (!searchInput.value.trim()) { suggestions.classList.add('hidden'); searchInput.setAttribute('aria-expanded', 'false'); return; }
  if (!matches.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-suggestion';
    empty.textContent = 'No close match yet — try a make or model name.';
    suggestions.appendChild(empty);
  } else {
    matches.forEach((vehicle, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `suggestion${index === activeIndex ? ' active' : ''}`;
      button.setAttribute('role', 'option');
      button.setAttribute('aria-selected', String(index === activeIndex));
      const info = document.createElement('span');
      const title = document.createElement('strong');
      title.textContent = vehicle.label;
      const meta = document.createElement('small');
      meta.textContent = [vehicle.type, vehicle.year].filter(Boolean).join(' · ');
      const action = document.createElement('em');
      action.textContent = 'Select →';
      info.append(title, meta);
      button.append(info, action);
      button.addEventListener('click', () => chooseVehicle(vehicle));
      suggestions.appendChild(button);
    });
  }
  suggestions.classList.remove('hidden');
  searchInput.setAttribute('aria-expanded', 'true');
  const active = suggestions.querySelector('.suggestion.active');
  if (active) {
    const top = active.offsetTop;
    const bottom = top + active.offsetHeight;
    suggestions.scrollTop = Math.max(bottom - suggestions.clientHeight, Math.min(previousScroll, top));
  }
}

async function augmentCatalog(value, year) {
  if (!year) return;
  const normalized = normalize(value);
  const make = Object.keys(vehicles).sort((a, b) => b.length - a.length).find(name => ` ${normalized} `.includes(` ${normalize(name)} `));
  if (!make) return;
  try {
    const models = await lookupCache.get('catalog', `${year}|${normalize(make)}`, async () => {
      try {
        const data = await lookupJson(`/api/catalog?${new URLSearchParams({ year, make })}`);
        return { value: data.models, expiresAt: data.expiresAt };
      } catch (_) {
        const data = await lookupJson(`https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeYear/make/${encodeURIComponent(make)}/modelyear/${year}?format=json`);
        return { value: data.Results.map(item => item.Model_Name), expiresAt: new Date(Date.now() + 86400000).toISOString() };
      }
    });
    const known = new Set(catalog.map(item => normalize(`${item.make} ${item.model}`)));
    const entries = models.filter(model => model && !known.has(normalize(`${make} ${model}`)))
      .map(model => ({ make, model, type: 'vehicle', label: `${make} ${model}` }));
    if (!catalogByYear.has(year)) catalogByYear.set(year, new Map());
    catalogByYear.get(year).set(make, entries);
    if (searchInput.value === value && yearSelect.value === year && !$('#search-view').classList.contains('hidden')) renderSuggestions();
  } catch (_) { /* Keep the local catalogue when the public service is unavailable. */ }
}

function chooseVehicle(vehicle) {
  clearTimeout(catalogTimer);
  searchInput.value = vehicle.label;
  suggestions.classList.add('hidden');
  searchInput.setAttribute('aria-expanded', 'false');
  if (!vehicle.year) {
    yearSelect.reportValidity();
    return;
  }
  selectedVehicle = vehicle;
  yearSelect.value = vehicle.year;
  const recent = vehicleRecord(vehicle);
  recentSearches = [recent, ...recentSearches.filter(item => vehicleKey(item) !== vehicleKey(recent))].slice(0, recentSearchLimit);
  lookupCache.write(historyKey, recentSearches);
  renderRecentSearches();
  openVehicle(vehicle);
}

async function findVehiclePhotos(vehicle) {
  const year = Number(vehicle.year);
  const trim = vehicle.trim || '';
  if (normalize(vehicle.label) === 'suzuki wagon r' && year >= 2017 && year <= 2021 && (!trim || normalize(trim) === 'hybrid fx')) {
    return [{
      url: '/images/suzuki-wagon-r-hybrid-fx.jpg',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:2017-2022_Suzuki_Wagon_R_Hybrid_FX.jpg',
      title: 'Japanese-market Suzuki Wagon R Hybrid FX, sixth generation',
      artist: 'TTTNIS',
      license: 'CC0 1.0',
      licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
      credit: 'Wikimedia Commons'
    }];
  }
  const params = new URLSearchParams({ year: vehicle.year, make: vehicle.make, model: vehicle.model, photoOnly: '1' });
  if (trim) params.set('trim', trim);
  const token = localStorage.getItem('auto_lookup_access_token');
  return lookupCache.get('photos', `${token ? 'signed-in' : 'public'}|${vehicleKey(vehicle)}`, async () => {
    const data = await lookupJson(`/api/vehicle?${params}`, token);
    return { value: data.images, expiresAt: data.expiresAt };
  });
}

async function renderVehiclePhoto(vehicle) {
  const visual = $('#vehicle-visual');
  const caption = $('#photo-caption');
  const credit = $('#photo-credit');
  const attribution = $('#photo-attribution');
  caption.classList.add('hidden');
  visual.innerHTML = '<div class="photo-loading">Finding vehicle photo…</div>';
  let photos;
  try {
    photos = await findVehiclePhotos(vehicle);
  } catch (_) {
    if (selectedVehicle === vehicle) visual.innerHTML = '<div class="photo-fallback">Vehicle photos are temporarily unavailable.</div>';
    return;
  }

  function showPhoto(index) {
    if (selectedVehicle !== vehicle) return;
    const photo = photos[index];
    if (!photo) {
      visual.innerHTML = photos.length
        ? '<div class="photo-fallback">The matching photos could not be loaded.</div>'
        : '<div class="photo-fallback">No matching photo found for this vehicle.</div>';
      caption.classList.add('hidden');
      return;
    }
    const image = document.createElement('img');
    image.className = 'vehicle-photo';
    image.alt = photo.title || vehicleTitle(vehicle);
    image.referrerPolicy = 'no-referrer';
    image.addEventListener('load', () => displayPhoto(image, photo), { once: true });
    image.addEventListener('error', () => showPhoto(index + 1), { once: true });
    image.src = photo.url;
  }

  function displayPhoto(image, photo) {
    if (selectedVehicle !== vehicle) return;
    credit.href = /^https:\/\//i.test(photo.sourceUrl || '') ? photo.sourceUrl : photo.url;
    credit.textContent = `${photo.credit} ↗`;
    credit.title = photo.title || '';
    visual.replaceChildren(image);
    attribution.textContent = photo.artist || '';
    const separator = photo.artist ? ' · ' : '';
    if (photo.license && /^https:\/\//i.test(photo.licenseUrl || '')) {
      const license = document.createElement('a');
      license.href = photo.licenseUrl;
      license.target = '_blank';
      license.rel = 'noopener';
      license.textContent = photo.license;
      attribution.append(separator, license);
    } else if (photo.license) {
      attribution.append(`${separator}${photo.license}`);
    }
    attribution.classList.toggle('hidden', !attribution.textContent);
    caption.classList.remove('hidden');
  }

  showPhoto(0);
}

let issueRequest = 0;
const nhtsaAliases = { 'Corvette Stingray': 'Corvette', 'Cooper 3-Door': 'Cooper', 'Cooper 5-Door': 'Cooper', 'Cooper Convertible': 'Cooper' };
const pretty = value => String(value || 'Vehicle').toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase());
const clip = (value, length = 360) => String(value || '').length > length ? `${String(value).slice(0, length).trim()}…` : String(value || '');

function buildIssue({ title, category, badge, preview, original, kind = 'report', sections }) {
  const item = document.createElement('div');
  item.className = `issue-item issue-${kind}`;
  const button = document.createElement('button');
  button.className = 'issue';
  button.type = 'button';
  button.setAttribute('aria-expanded', 'false');
  const appendText = (parent, tag, english, japanese, className = '') => {
    const copy = document.createElement(tag);
    copy.textContent = english;
    copy.className = className;
    parent.appendChild(copy);
    if (japanese) {
      copy.classList.add('issue-language-english');
      const translated = document.createElement(tag);
      translated.textContent = japanese;
      translated.lang = 'ja';
      translated.className = className;
      translated.classList.add('issue-language-original');
      parent.appendChild(translated);
    }
  };
  const heading = document.createElement('div');
  appendText(heading, 'strong', title, original?.title);
  if (preview) appendText(heading, 'small', preview, original?.preview);
  appendText(heading, 'p', category, original?.category);
  const tail = document.createElement('span');
  tail.className = 'issue-tail';
  if (badge) appendText(tail, 'em', badge, original?.badge, 'issue-tag');
  const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  arrow.setAttribute('viewBox', '0 0 24 24');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'm9 6 6 6-6 6');
  arrow.appendChild(path);
  tail.appendChild(arrow);
  button.append(heading, tail);
  const detail = document.createElement('div');
  detail.className = 'issue-detail hidden';
  sections.forEach(section => {
    const block = document.createElement('div');
    if (section.language) block.className = `issue-language-${section.language}`;
    if (section.language === 'original') block.lang = 'ja';
    const label = document.createElement('span');
    label.textContent = section.label;
    const copy = document.createElement(section.url ? 'a' : 'p');
    copy.textContent = section.text;
    if (section.url) {
      copy.href = section.url;
      copy.target = '_blank';
      copy.rel = 'noopener';
    }
    block.append(label, copy);
    detail.appendChild(block);
  });
  item.append(button, detail);
  return item;
}

async function fetchNhtsa(kind, vehicle) {
  const model = nhtsaAliases[vehicle.model] || vehicle.model;
  const url = new URL(`https://api.nhtsa.gov/${kind}/${kind}ByVehicle`);
  url.searchParams.set('make', vehicle.make);
  url.searchParams.set('model', model);
  url.searchParams.set('modelYear', vehicle.year);
  return lookupJson(url);
}

function summarizeComplaints(complaints) {
  const groups = new Map();
  for (const complaint of complaints) {
    const component = (complaint.components || complaint.Components || 'Other').split(',')[0].trim();
    const group = groups.get(component);
    if (group) group.count++;
    else groups.set(component, { component, count: 1, summary: clip(complaint.summary || complaint.Summary, 300) });
  }
  return [...groups.values()].filter(group => group.count >= 2).sort((a, b) => b.count - a.count).slice(0, 4);
}

async function fetchKnownIssues(vehicle) {
  const model = nhtsaAliases[vehicle.model] || vehicle.model;
  const params = new URLSearchParams({ year: vehicle.year, make: vehicle.make, model });
  const token = localStorage.getItem('auto_lookup_access_token');
  const key = `${token ? 'signed-in' : 'public'}|${vehicleKey({ ...vehicle, model, trim: '' })}`;
  return lookupCache.get('issues', key, async () => {
    let data;
    try {
      data = await lookupJson(`/api/issues?${params}`, token);
    } catch (_) {
      const [recalls, complaints] = await Promise.allSettled([fetchNhtsa('recalls', vehicle), fetchNhtsa('complaints', vehicle)]);
      const reached = Boolean(recalls.value || complaints.value);
      data = {
        recalls: recalls.value?.results || [],
        complaints: complaints.value?.results || [],
        reached,
        expiresAt: reached ? new Date(Date.now() + 3600000).toISOString() : null
      };
    }
    const { complaints, expiresAt, ...records } = data;
    return { value: { ...records, complaintPatterns: summarizeComplaints(complaints || []) }, expiresAt };
  });
}

async function loadKnownIssues(vehicle) {
  const request = ++issueRequest;
  const list = $('#issues-list');
  const count = $('#issue-count');
  const source = $('#issues-source');
  const translate = $('#translate-issues');
  translate.classList.add('hidden');
  list.innerHTML = '<div class="issues-state loading">Loading public records…</div>';
  count.textContent = '…';
  source.classList.add('hidden');
  const records = await fetchKnownIssues(vehicle);
  if (request !== issueRequest) return;
  if (records.sources?.includes('CarsXE')) {
    source.href = 'https://docs.carsxe.com/docs/products/recalls';
    source.textContent = 'Safety data · NHTSA + CarsXE ↗';
  } else {
    source.href = 'https://www.nhtsa.gov/nhtsa-datasets-and-apis';
    source.textContent = 'US public safety data · NHTSA ↗';
  }
  if (records.sources?.includes('Japan MLIT')) {
    source.href = records.sourceUrl || 'https://renrakuda.mlit.go.jp/';
    source.textContent = 'Official records · Japan MLIT + NHTSA ↗';
  }

  const recallIssues = records.recalls.slice(0, 4).map(recall => {
    const component = recall.Component || recall.component;
    const campaign = recall.NHTSACampaignNumber || recall.nhtsaCampaignNumber || 'Official recall';
    const japanese = Boolean(recall.OriginalComponent || recall.OriginalSituation || recall.OriginalRemedy);
    const language = japanese ? 'english' : undefined;
    const genericGuidance = japanese && !recall.EnglishFilingSummary;
    return {
      title: japanese ? (component || 'Vehicle system') : pretty(component),
      category: `${campaign} · Official campaign`,
      badge: 'Recall',
      kind: 'recall',
      preview: clip(recall.AffectedParts || component || 'Vehicle system', 90),
      original: japanese ? {
        title: recall.OriginalComponent || '車両装置',
        category: `${campaign} · リコール届出`,
        badge: 'リコール',
        preview: clip(recall.OriginalSituation || recall.OriginalRemedy || '届出内容を確認', 90)
      } : null,
      sections: [
        { label: genericGuidance ? 'Related parts' : 'Affected parts', text: clip(recall.AffectedParts || component || 'See the campaign record.', 260), language },
        { label: genericGuidance ? 'General guidance' : 'What could happen', text: clip(recall.Consequence || recall.consequence || recall.Summary || recall.summary || 'See the official recall record.'), language },
        ...(recall.Symptoms ? [{ label: 'What you may notice', text: recall.Symptoms, language }] : []),
        { label: japanese && !genericGuidance ? 'Campaign remedy' : 'Usual action', text: clip(recall.Remedy || recall.remedy || 'Contact an authorised dealer with the campaign number.'), language },
        ...(recall.OriginalSituation ? [{ label: '不具合の内容', text: recall.OriginalSituation, language: 'original' }] : []),
        ...(recall.OriginalRemedy ? [{ label: '改善の内容', text: recall.OriginalRemedy, language: 'original' }] : []),
        { label: 'Eligibility', text: 'This is a model-line match. Confirm the campaign against the chassis or VIN before approving any repair.', language },
        ...(japanese ? [{ label: '対象車両', text: '修理の前に、車台番号でリコールの対象車両かどうかを確認してください。', language: 'original' }] : []),
        ...(recall.SourceUrl ? [{ label: 'Official notice', text: 'Open campaign filing ↗', url: recall.SourceUrl, language }] : []),
        ...(japanese && recall.SourceUrl ? [{ label: '公式資料', text: 'リコール届出を開く ↗', url: recall.SourceUrl, language: 'original' }] : [])
      ]
    };
  });

  const complaintIssues = records.complaintPatterns.map(group => ({
      title: pretty(group.component),
      category: 'Owner reports',
      badge: `${group.count} reports`,
      kind: 'report',
      preview: `${pretty(group.component)} system`,
      sections: [
        { label: 'Pattern', text: group.summary || 'Multiple owners reported concerns involving this system.' },
        { label: 'Next step', text: 'Have this system inspected. Owner reports do not establish a confirmed repair or defect.' }
      ]
    }));

  const modelPatterns = (records.patterns || []).slice(0, 6).map(pattern => ({
    title: pattern.title,
    category: pattern.category,
    badge: `${pattern.count} reports`,
    kind: 'report',
    preview: pattern.affectedParts,
    original: pattern.originalComponent ? {
      title: `${pattern.originalComponent}の報告`,
      category: '日本のユーザー報告',
      badge: `${pattern.count}件`,
      preview: `集計対象の報告の${pattern.share}%`
    } : null,
    sections: [
      { label: 'Affected parts', text: pattern.affectedParts },
      { label: 'Possible problem', text: pattern.possibleProblem },
      { label: 'What you may notice', text: pattern.symptoms },
      { label: 'Inspection / repair', text: pattern.typicalAction },
      { label: 'Report pattern', text: pattern.summary },
      { label: 'Important', text: 'Owner reports do not establish that a part needs replacement.' }
    ].map(section => ({ ...section, language: pattern.originalComponent ? 'english' : undefined })).concat(pattern.originalComponent ? [
      { label: '報告の内訳', text: `${pattern.originalComponent}に関する報告は${pattern.count}件で、集計対象の${pattern.share}%です。`, language: 'original' },
      { label: '注意', text: 'ユーザー報告だけでは、不具合や部品交換の必要性は確認できません。', language: 'original' }
    ] : [])
  }));

  const items = [...recallIssues, ...complaintIssues, ...modelPatterns];
  list.innerHTML = '';
  if (!records.reached) {
    list.innerHTML = '<div class="issues-state">Public safety data is temporarily unavailable.</div>';
  } else if (!items.length) {
    list.innerHTML = '<div class="issues-state">No US recalls or repeated complaint patterns found for this exact vehicle.</div>';
    source.classList.remove('hidden');
  } else {
    items.forEach(item => list.appendChild(buildIssue(item)));
    source.classList.remove('hidden');
    translate.classList.toggle('hidden', !items.some(item => item.original));
  }
  count.textContent = items.length;
}

function openVehicle(vehicle) {
  $('#vehicle-name').textContent = vehicle.label;
  $('#vehicle-year').textContent = vehicle.year;
  const meta = $('#vehicle-meta');
  meta.textContent = vehicle.trim || '';
  meta.classList.toggle('hidden', !vehicle.trim);
  $('#photo-trim').value = vehicle.trim || '';
  $('#photo-options').open = false;
  updateSaveButton();
  renderVehiclePhoto(vehicle);
  loadKnownIssues(vehicle);
  showOnly('#car-view');
}

let catalogTimer;
function updateSearchSuggestions() {
  selectedVehicle = null;
  activeIndex = -1;
  renderSuggestions();
  clearTimeout(catalogTimer);
  catalogTimer = setTimeout(() => augmentCatalog(searchInput.value, yearSelect.value), 250);
}

searchInput.addEventListener('input', () => {
  const leadingYear = /^\s*(\d{4})(?:[\s,]+|$)/.exec(searchInput.value);
  if (leadingYear && Number(leadingYear[1]) >= 1886 && Number(leadingYear[1]) <= latestYear) {
    yearSelect.value = leadingYear[1];
    searchInput.value = searchInput.value.slice(leadingYear[0].length);
  }
  updateSearchSuggestions();
});
yearSelect.addEventListener('change', updateSearchSuggestions);
searchInput.addEventListener('focus', renderSuggestions);
searchInput.addEventListener('keydown', event => {
  if (event.key === 'ArrowDown' && matches.length) { event.preventDefault(); activeIndex = Math.min(activeIndex + 1, matches.length - 1); renderSuggestions(); }
  if (event.key === 'ArrowUp' && matches.length) { event.preventDefault(); activeIndex = Math.max(activeIndex - 1, 0); renderSuggestions(); }
  if (event.key === 'Escape') { suggestions.classList.add('hidden'); searchInput.setAttribute('aria-expanded', 'false'); }
});

$('#vehicle-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const best = selectedVehicle || matches[Math.max(activeIndex, 0)] || findMatches(searchInput.value)[0];
  if (best) chooseVehicle(best); else searchInput.focus();
});

$('#photo-variant-form').addEventListener('submit', event => {
  event.preventDefault();
  if (!selectedVehicle) return;
  const trim = $('#photo-trim').value.trim();
  if (trim === (selectedVehicle.trim || '')) return;
  chooseVehicle({ ...selectedVehicle, trim });
  $('#photo-options summary').focus();
});

renderRecentSearches();
renderSavedVehicles();

$('#save-vehicle').addEventListener('click', () => {
  if (!selectedVehicle) return;
  if (isVehicleSaved(selectedVehicle)) removeSavedVehicle(selectedVehicle);
  else storeSavedVehicles([vehicleRecord(selectedVehicle), ...savedVehicles]);
});

window.addEventListener('storage', event => {
  if (event.key !== savedVehiclesKey) return;
  savedVehicles = lookupCache.read(savedVehiclesKey, []);
  renderSavedVehicles();
  updateSaveButton();
});

$('#back-btn').addEventListener('click', () => showOnly('#search-view'));

const vehicleTabs = [...$$('#car-view .tab')];

function activateVehicleTab(selectedTab) {
  for (const tab of vehicleTabs) {
    const active = tab === selectedTab;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
    document.getElementById(tab.getAttribute('aria-controls')).classList.toggle('hidden', !active);
  }
}

vehicleTabs.forEach((tab, index) => {
  tab.addEventListener('click', () => activateVehicleTab(tab));
  tab.addEventListener('keydown', event => {
    const destinations = {
      ArrowLeft: (index - 1 + vehicleTabs.length) % vehicleTabs.length,
      ArrowRight: (index + 1) % vehicleTabs.length,
      Home: 0,
      End: vehicleTabs.length - 1
    };
    if (!Object.hasOwn(destinations, event.key)) return;
    event.preventDefault();
    const nextTab = vehicleTabs[destinations[event.key]];
    activateVehicleTab(nextTab);
    nextTab.focus();
  });
});

$('#translate-issues').addEventListener('click', () => {
  const panel = $('#known-panel');
  const button = $('#translate-issues');
  const showingOriginal = panel.classList.toggle('show-original');
  button.setAttribute('aria-pressed', String(showingOriginal));
  button.title = showingOriginal ? 'Show English explanation' : 'Show original Japanese filing text';
  button.querySelector('span').textContent = showingOriginal ? 'English' : '日本語';
});

$('#issues-list').addEventListener('click', event => {
  const button = event.target.closest('.issue');
  if (!button) return;
  const item = button.closest('.issue-item');
  const detail = item.querySelector('.issue-detail');
  const wasOpen = button.getAttribute('aria-expanded') === 'true';
  $$('#issues-list .issue').forEach(other => {
    other.setAttribute('aria-expanded', 'false');
    other.closest('.issue-item').querySelector('.issue-detail').classList.add('hidden');
  });
  if (!wasOpen) {
    button.setAttribute('aria-expanded', 'true');
    detail.classList.remove('hidden');
  }
});

$$('.examples button').forEach(button => button.addEventListener('click', () => {
  $('#problem-input').value = button.textContent;
  $('#problem-input').focus();
}));

let diagnosisCategory = null;

function fillList(selector, items) {
  const list = $(selector);
  list.innerHTML = '';
  items.forEach(item => {
    const li = document.createElement('li');
    li.textContent = item;
    list.appendChild(li);
  });
}

function renderDiagnosisResult(diagnosis) {
  $('#follow-up').classList.add('hidden');
  $('#choices').innerHTML = '';
  $('#result-title').textContent = diagnosis.title;
  $('#result-explanation').textContent = diagnosis.explanation;
  fillList('#result-parts', diagnosis.parts);
  fillList('#result-checks', diagnosis.checks);
  $('#result-action').textContent = diagnosis.action;
  $('#result-urgency').textContent = diagnosis.urgency;
  $('#result .garage-note p').textContent = `“${diagnosis.garageQuestion}”`;
  $('#result-safety').textContent = `Guidance only—not a confirmed diagnosis. ${diagnosis.safety}`;
  $('#result').classList.remove('hidden');
}

async function requestDiagnosis(answer) {
  const problem = $('#user-message').textContent;
  const choices = $('#choices');
  choices.innerHTML = '<span class="diagnosis-loading">Checking...</span>';
  try {
    const response = await fetch('/api/diagnose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        problem,
        answer,
        category: diagnosisCategory,
        year: selectedVehicle?.year,
        make: selectedVehicle?.make,
        model: selectedVehicle?.model
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not assess this symptom.');
    diagnosisCategory = data.category;
    if (data.stage === 'result') return renderDiagnosisResult(data.diagnosis);
    $('#assistant-question').textContent = data.question;
    choices.innerHTML = '';
    data.choices.forEach(choice => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = choice.label;
      button.addEventListener('click', () => requestDiagnosis(choice.id));
      choices.appendChild(button);
    });
  } catch (error) {
    $('#assistant-question').textContent = error.message;
    choices.innerHTML = '';
  }
}

function startDiagnosis() {
  const text = $('#problem-input').value.trim();
  if (!text) { $('#problem-input').focus(); return; }
  diagnosisCategory = null;
  $('#user-message').textContent = text;
  $('#follow-up').classList.remove('hidden');
  $('#result').classList.add('hidden');
  $('#diagnosis-intro').classList.add('hidden');
  $('#chat-panel').classList.remove('hidden');
  requestDiagnosis();
}

$('#start-diagnosis').addEventListener('click', startDiagnosis);
$('#problem-input').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); startDiagnosis(); }
});

$('#restart-diagnosis').addEventListener('click', () => {
  diagnosisCategory = null;
  $('#problem-input').value = '';
  $('#chat-panel').classList.add('hidden');
  $('#diagnosis-intro').classList.remove('hidden');
  $('#result').classList.add('hidden');
  $('#problem-input').focus();
});

const authStore = {
  token: localStorage.getItem('auto_lookup_access_token'),
  refreshToken: localStorage.getItem('auto_lookup_refresh_token'),
  config: null,
  user: null
};

function saveSession(data) {
  if (!data?.access_token) return false;
  authStore.token = data.access_token;
  localStorage.setItem('auto_lookup_access_token', data.access_token);
  if (data.refresh_token) {
    authStore.refreshToken = data.refresh_token;
    localStorage.setItem('auto_lookup_refresh_token', data.refresh_token);
  }
  return true;
}

function clearSession() {
  authStore.token = null;
  authStore.refreshToken = null;
  localStorage.removeItem('auto_lookup_access_token');
  localStorage.removeItem('auto_lookup_refresh_token');
}

function captureAuthCallback() {
  const params = new URLSearchParams(location.hash.replace(/^#/, ''));
  const error = params.get('error_description');
  if (!params.has('access_token') && !error) return false;
  if (params.has('access_token')) saveSession({ access_token: params.get('access_token'), refresh_token: params.get('refresh_token') });
  history.replaceState({}, document.title, `${location.pathname}${location.search}`);
  showOnly('#profile-view');
  const status = $('#auth-status');
  if (status) status.textContent = error ? decodeURIComponent(error.replace(/\+/g, ' ')) : 'Email confirmed. You are signed in.';
  return true;
}

async function refreshSession() {
  if (!authStore.refreshToken || !authStore.config) return false;
  const response = await fetch(`${authStore.config.supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { apikey: authStore.config.supabaseAnonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: authStore.refreshToken })
  });
  if (!response.ok) return false;
  return saveSession(await response.json());
}

function showOnly(view) {
  ['#search-view', '#car-view', '#profile-view'].forEach(selector => $(selector).classList.add('hidden'));
  $(view).classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderSignedOut() {
  authStore.user = null;
  $('#profile-state').textContent = 'Sign in to use your own data providers.';
  $('#auth-form').classList.remove('hidden');
  $('#provider-form').classList.add('hidden');
  $('#sign-out').classList.add('hidden');
}

async function loadProfile() {
  const state = $('#profile-state');
  try {
    const response = await fetch('/api/config');
    if (!response.ok) throw new Error('Backend is not running');
    authStore.config = await response.json();
    if (!authStore.config.auth) throw new Error('Account service is not configured yet');
    if (!authStore.token) return renderSignedOut();
    const userResponse = await fetch(`${authStore.config.supabaseUrl}/auth/v1/user`, {
      headers: { apikey: authStore.config.supabaseAnonKey, Authorization: `Bearer ${authStore.token}` }
    });
    if (!userResponse.ok && await refreshSession()) {
      return loadProfile();
    }
    if (!userResponse.ok) {
      clearSession();
      return renderSignedOut();
    }
    authStore.user = await userResponse.json();
    state.textContent = authStore.user.email;
    $('#auth-form').classList.add('hidden');
    $('#provider-form').classList.remove('hidden');
    $('#sign-out').classList.remove('hidden');
    await loadProviders();
  } catch (error) {
    state.textContent = error.message;
    $('#auth-form').classList.add('hidden');
    $('#provider-form').classList.add('hidden');
    $('#sign-out').classList.add('hidden');
  }
}

async function authRequest(action) {
  const email = $('#auth-email').value.trim();
  const password = $('#auth-password').value;
  const status = $('#auth-status');
  if (!email || password.length < 8) return;
  status.textContent = 'Please wait...';
  const endpoint = action === 'signup'
    ? `${authStore.config.supabaseUrl}/auth/v1/signup?redirect_to=${encodeURIComponent(`${location.origin}/`)}`
    : `${authStore.config.supabaseUrl}/auth/v1/${action}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { apikey: authStore.config.supabaseAnonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await response.json();
  if (!response.ok) { status.textContent = data.msg || data.error_description || 'Could not continue'; return; }
  if (!data.access_token) { status.textContent = 'Check your email to confirm the account.'; return; }
  saveSession(data);
  status.textContent = '';
  await loadProfile();
}

async function loadProviders() {
  const response = await fetch('/api/providers', { headers: { Authorization: `Bearer ${authStore.token}` } });
  const data = await response.json();
  const connection = data.connections?.find(item => item.provider === 'carsxe');
  $('#provider-state').textContent = connection ? `Connected · ending ${connection.key_hint}` : 'Not connected';
  $('#provider-dot').classList.toggle('connected', Boolean(connection));
  $('#remove-provider').classList.toggle('hidden', !connection);
}

let profileReturnView = '#search-view';

function openProfile(returnView, backLabel) {
  profileReturnView = returnView;
  $('#profile-back-label').textContent = backLabel;
  showOnly('#profile-view');
  loadProfile();
}

$('#profile-btn').addEventListener('click', () => openProfile('#search-view', 'Back to search'));
$('#vehicle-profile-btn').addEventListener('click', () => openProfile('#car-view', 'Back to vehicle'));
$('#profile-back').addEventListener('click', () => {
  showOnly(profileReturnView);
  $(profileReturnView === '#car-view' ? '#vehicle-profile-btn' : '#profile-btn').focus();
});
$('#auth-form').addEventListener('submit', event => { event.preventDefault(); authRequest('token?grant_type=password'); });
$('#sign-up').addEventListener('click', () => authRequest('signup'));
$('#sign-out').addEventListener('click', async () => {
  if (authStore.config && authStore.token) {
    await fetch(`${authStore.config.supabaseUrl}/auth/v1/logout?scope=global`, {
      method: 'POST',
      headers: { apikey: authStore.config.supabaseAnonKey, Authorization: `Bearer ${authStore.token}` }
    }).catch(() => {});
  }
  clearSession();
  renderSignedOut();
});
$('#provider-form').addEventListener('submit', async event => {
  event.preventDefault();
  const key = $('#provider-key').value.trim();
  const status = $('#provider-status');
  if (!key) return $('#provider-key').focus();
  status.textContent = 'Checking key...';
  const response = await fetch('/api/providers', {
    method: 'POST',
    headers: { Authorization: `Bearer ${authStore.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ key })
  });
  const data = await response.json();
  if (!response.ok) { status.textContent = data.error || 'Could not save key'; return; }
  $('#provider-key').value = '';
  status.textContent = 'Connected.';
  await loadProviders();
});
$('#remove-provider').addEventListener('click', async () => {
  await fetch('/api/providers', { method: 'DELETE', headers: { Authorization: `Bearer ${authStore.token}` } });
  $('#provider-status').textContent = 'Connection removed.';
  await loadProviders();
});

if (captureAuthCallback()) loadProfile();
