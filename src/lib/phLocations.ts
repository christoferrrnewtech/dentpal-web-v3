// Lightweight static PH locations dataset to avoid slow network fetches
// Source normalized: province_code, province_name, city_code, city_name
// Keep minimal to reduce bundle size; extend as needed.

export type Province = { code: string; name: string };
export type City = { code: string; name: string; provinceCode: string };

// Static fallback provinces (used when CDN fetch fails)
export const provinces: Province[] = [
  { code: "NCR", name: "Metro Manila" },
  { code: "ALB", name: "Albay" },
  { code: "CAV", name: "Cavite" },
  { code: "RIZ", name: "Rizal" },
  { code: "LAG", name: "Laguna" },
  { code: "BAT", name: "Batangas" },
  { code: "BUL", name: "Bulacan" },
];

export const cities: City[] = [
  // Metro Manila (NCR)
  { code: "MNL", name: "Manila", provinceCode: "NCR" },
  { code: "MAC", name: "Makati", provinceCode: "NCR" },
  { code: "TAG", name: "Taguig", provinceCode: "NCR" },
  { code: "QSZ", name: "Quezon City", provinceCode: "NCR" },
  { code: "PAS", name: "Pasay", provinceCode: "NCR" },
  { code: "PAR", name: "Parañaque", provinceCode: "NCR" },
  { code: "MAN", name: "Mandaluyong", provinceCode: "NCR" },
  { code: "SAN", name: "San Juan", provinceCode: "NCR" },
  { code: "CAL", name: "Caloocan", provinceCode: "NCR" },
  { code: "VAL", name: "Valenzuela", provinceCode: "NCR" },
  { code: "NAV", name: "Navotas", provinceCode: "NCR" },
  { code: "MUN", name: "Muntinlupa", provinceCode: "NCR" },
  { code: "LAS", name: "Las Piñas", provinceCode: "NCR" },
  { code: "MAR", name: "Marikina", provinceCode: "NCR" },
  // Albay (ALB)
  { code: "LEG", name: "Legazpi City", provinceCode: "ALB" },
  { code: "TAB", name: "Tabaco City", provinceCode: "ALB" },
  { code: "LIG", name: "Ligao City", provinceCode: "ALB" },
  // Cavite
  { code: "DAS", name: "Dasmariñas", provinceCode: "CAV" },
  { code: "IMO", name: "Imus", provinceCode: "CAV" },
  { code: "BAC", name: "Bacoor", provinceCode: "CAV" },
  { code: "GEN", name: "General Trias", provinceCode: "CAV" },
  // Rizal
  { code: "ANT", name: "Antipolo", provinceCode: "RIZ" },
  { code: "CAY", name: "Cainta", provinceCode: "RIZ" },
  { code: "TAY", name: "Taytay", provinceCode: "RIZ" },
  // Laguna
  { code: "SANP", name: "San Pablo", provinceCode: "LAG" },
  { code: "STA", name: "Santa Rosa", provinceCode: "LAG" },
  { code: "CALB", name: "Calamba", provinceCode: "LAG" },
  // Batangas
  { code: "LIP", name: "Lipa", provinceCode: "BAT" },
  { code: "BATC", name: "Batangas City", provinceCode: "BAT" },
  // Bulacan
  { code: "MALO", name: "Malolos", provinceCode: "BUL" },
  { code: "MEY", name: "Meycauayan", provinceCode: "BUL" },
];

// Data source: https://github.com/hubertursua/ph-locations
const PHL_PROVINCES_URL = 'https://raw.githubusercontent.com/hubertursua/ph-locations/main/dist/provinces.json';
const PHL_CITIES_URL = 'https://raw.githubusercontent.com/hubertursua/ph-locations/main/dist/cities.json';
// Local offline fallbacks (place complete JSON copies in public/phl/*)
const LOCAL_PROVINCES_URL = '/phl/provinces.json';
const LOCAL_CITIES_URL = '/phl/cities.json';

const CACHE_KEY_PROV = 'phl_provinces_v2';
const CACHE_KEY_CITIES = 'phl_cities_v1';

async function fetchJsonWithFallback(primaryUrl: string, backupUrl?: string): Promise<any[] | null> {
  try {
    const res = await fetch(primaryUrl, { cache: 'force-cache' });
    if (res.ok) return await res.json();
    throw new Error('Primary fetch failed');
  } catch (e) {
    if (backupUrl) {
      try {
        const res2 = await fetch(backupUrl, { cache: 'force-cache' });
        if (res2.ok) return await res2.json();
      } catch (e2) {
        console.warn('Backup fetch failed', e2);
      }
    }
    return null;
  }
}

// Prefer local package data when available (ph-locations). Use dynamic import so app runs even if package isn’t installed.
async function loadFromPackage(): Promise<{ provinces?: Province[]; cities?: City[] } | null> {
  try {
    const mod: any = await import('ph-locations');
    const pRaw: any[] = Array.isArray(mod.provinces) ? mod.provinces : [];
    const cRaw: any[] = Array.isArray(mod.cities) ? mod.cities : [];
    const pList: Province[] = pRaw
      .map((p: any) => ({ code: String(p.code || p.province_code || p.id), name: String(p.name || p.province_name) }))
      .sort((a, b) => a.name.localeCompare(b.name));
    const cList: City[] = cRaw
      .map((c: any) => ({
        code: String(c.code || c.city_code || c.id),
        name: String(c.name || c.city_name),
        provinceCode: String(c.provinceCode || c.province_code)
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return { provinces: pList, cities: cList };
  } catch (e) {
    // Package not installed or failed to load
    return null;
  }
}

async function loadProvincesFromRepo(): Promise<Province[] | null> {
  try {
    const cached = localStorage.getItem(CACHE_KEY_PROV);
    if (cached) return JSON.parse(cached);

    // 1) Try package
    const pkg = await loadFromPackage();
    if (pkg?.provinces?.length) {
      localStorage.setItem(CACHE_KEY_PROV, JSON.stringify(pkg.provinces));
      return pkg.provinces;
    }

    // 2) Try CDN then local JSON
    const json = await fetchJsonWithFallback(PHL_PROVINCES_URL, LOCAL_PROVINCES_URL);
    const list: Province[] = (Array.isArray(json) ? json : [])
      .map((p: any) => ({ code: String(p.code), name: String(p.name) }))
      .sort((a, b) => a.name.localeCompare(b.name));
    const finalList = list.length ? list : provinces.slice();
    localStorage.setItem(CACHE_KEY_PROV, JSON.stringify(finalList));
    return finalList;
  } catch (e) {
    console.warn('PH provinces load failed', e);
    return provinces.slice();
  }
}

async function loadCitiesFromRepo(): Promise<City[] | null> {
  try {
    const cached = localStorage.getItem(CACHE_KEY_CITIES);
    if (cached) return JSON.parse(cached);

    // 1) Try package
    const pkg = await loadFromPackage();
    if (pkg?.cities?.length) {
      localStorage.setItem(CACHE_KEY_CITIES, JSON.stringify(pkg.cities));
      return pkg.cities;
    }

    // 2) Try CDN then local JSON
    const json = await fetchJsonWithFallback(PHL_CITIES_URL, LOCAL_CITIES_URL);
    const list: City[] = (Array.isArray(json) ? json : [])
      .map((c: any) => ({ code: String(c.code), name: String(c.name), provinceCode: String(c.provinceCode || c.province_code) }))
      .sort((a, b) => a.name.localeCompare(b.name));
    const finalList = list.length ? list : cities.slice();
    localStorage.setItem(CACHE_KEY_CITIES, JSON.stringify(finalList));
    return finalList;
  } catch (e) {
    console.warn('PH cities load failed', e);
    // Always return a list to avoid UI hanging
    return cities.slice();
  }
}

export const getProvinces = async (): Promise<Province[]> => {
  const list = await loadProvincesFromRepo();
  return list ?? provinces.slice();
};

export const getCitiesByProvinceAsync = async (provinceCode: string): Promise<City[]> => {
  const list = await loadCitiesFromRepo();
  if (list) return list.filter(c => c.provinceCode === provinceCode);
  return getCitiesByProvince(provinceCode);
};

export const getCitiesByProvince = (provinceCode: string): City[] => {
  return cities
    .filter(c => c.provinceCode === provinceCode)
    .slice()
    .sort((a,b)=> a.name.localeCompare(b.name));
};

// Removed inline ambient declaration to avoid redeclaration conflicts.
// Types are declared in src/types/ph-locations.d.ts
