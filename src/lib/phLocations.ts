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

const CACHE_KEY_PROV = 'phl_provinces_v3'; // Updated to v3 to force refresh
const CACHE_KEY_CITIES = 'phl_cities_v2'; // Updated to v2 to force refresh

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
    // Try select-philippines-address first (most comprehensive)
    const selectMod: any = await import('select-philippines-address');
    const api = {
      regions: selectMod.regions || selectMod.default?.regions,
      provinces: selectMod.provinces || selectMod.default?.provinces,
      cities: selectMod.cities || selectMod.default?.cities,
    };
    
    if (api.regions && api.provinces) {
      // Get all regions first
      const regions = await api.regions();
      console.log('[phLocations] Found regions:', regions.length);
      const allProvinces: Province[] = [];
      
      // Fetch provinces for all regions sequentially to avoid rate limits
      for (const region of regions) {
        try {
          console.log('[phLocations] Fetching provinces for region:', region.region_name);
          const provs = await api.provinces(region.region_code);
          console.log('[phLocations] Got', provs.length, 'provinces for', region.region_name);
          
          if (Array.isArray(provs)) {
            provs.forEach((p: any) => {
              const provinceName = String(p.province_name || p.name || '').trim();
              const provinceCode = String(p.province_code || p.code || p.id || '').trim();
              
              if (provinceName && provinceCode) {
                allProvinces.push({
                  code: provinceCode,
                  name: provinceName
                });
              }
            });
          }
        } catch (e) {
          console.error('[phLocations] Failed to load provinces for region', region.region_name, ':', e);
        }
      }
      
      console.log('[phLocations] Total provinces loaded from select-philippines-address:', allProvinces.length);
      
      if (allProvinces.length > 0) {
        return { 
          provinces: allProvinces.sort((a, b) => a.name.localeCompare(b.name)),
          cities: [] // Cities loaded on-demand per province
        };
      }
    }
    
    // Fallback to ph-locations
    const phMod: any = await import('ph-locations');
    const pRaw: any[] = Array.isArray(phMod.provinces) ? phMod.provinces : [];
    const cRaw: any[] = Array.isArray(phMod.cities) ? phMod.cities : [];
    if (pRaw.length > 0) {
      console.log('[phLocations] Loaded provinces from ph-locations:', pRaw.length);
    }
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
    console.warn('[phLocations] Package load failed, using fallback data:', e);
    return null;
  }
}

async function loadProvincesFromRepo(): Promise<Province[] | null> {
  try {
    const cached = localStorage.getItem(CACHE_KEY_PROV);
    if (cached) {
      const parsed = JSON.parse(cached);
      console.log('[phLocations] Using cached provinces:', parsed.length);
      return parsed;
    }

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
    console.log('[phLocations] Loaded provinces from CDN/fallback:', finalList.length);
    localStorage.setItem(CACHE_KEY_PROV, JSON.stringify(finalList));
    return finalList;
  } catch (e) {
    console.warn('[phLocations] PH provinces load failed:', e);
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

const citiesCache = new Map<string, City[]>();
export const getCitiesByProvinceAsync = async (provinceCode: string): Promise<City[]> => {
  // Return from memory cache if available
  if (citiesCache.has(provinceCode)) {
    return citiesCache.get(provinceCode)!;
  }
  try {
    // Try to load cities directly from select-philippines-address for this province
    const selectMod: any = await import('select-philippines-address');
    const citiesApi = selectMod.cities || selectMod.default?.cities;
    
    if (citiesApi) {
      const cityData = await citiesApi(provinceCode);
      const citiesList: City[] = cityData.map((c: any) => ({
        code: String(c.city_code || c.code || c.id),
        name: String(c.city_name || c.name),
        provinceCode: String(provinceCode)
      })).sort((a: City, b: City) => a.name.localeCompare(b.name));
      
      console.log('[phLocations] Loaded cities for province', provinceCode, ':', citiesList.length);
      citiesCache.set(provinceCode, citiesList);
      return citiesList;
    }
  } catch (e) {
    console.warn('[phLocations] Failed to load cities from package for province', provinceCode, e);
  }
  
  // Fallback to cached/static data
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

// Helper to clear cached location data (useful for testing/debugging)
export const clearLocationCache = () => {
  localStorage.removeItem(CACHE_KEY_PROV);
  localStorage.removeItem(CACHE_KEY_CITIES);
  console.log('[phLocations] Cache cleared - reload the page to fetch all Philippines provinces');
};

// Removed inline ambient declaration to avoid redeclaration conflicts.
// Types are declared in src/types/ph-locations.d.ts
