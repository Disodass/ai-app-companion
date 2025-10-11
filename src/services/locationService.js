// Location Service for Crisis Resources (ESM)
// - Detects coarse user location
// - Returns tiered crisis resources
// - Formats short, skimmable blocks
// - Handles offline mode gracefully

// EU countries for 112 emergency number
const EU_COUNTRIES = new Set(['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','IS','NO','LI']);

// ---------- Utilities ----------
const normalizeProvince = (codeOrName) => {
  if (!codeOrName) return null;
  // Accept "CA-ON", "Ontario", "ON"
  const mapByName = {
    'ontario':'ON','british columbia':'BC','alberta':'AB','quebec':'QC','manitoba':'MB',
    'saskatchewan':'SK','nova scotia':'NS','new brunswick':'NB','newfoundland and labrador':'NL',
    'prince edward island':'PE','yukon':'YT','northwest territories':'NT','nunavut':'NU'
  };
  const s = String(codeOrName).toLowerCase();
  if (s.startsWith('ca-')) return s.slice(3).toUpperCase();
  if (mapByName[s]) return mapByName[s];
  if (s.length === 2) return s.toUpperCase();
  return null;
};

const yes247 = (...bools) => bools.some(Boolean);

// Emergency footer with EU 112 support
export const emergencyFooter = (cc) => {
  if (cc === 'CA' || cc === 'US') return '**Emergency:** Call **911** or go to the nearest emergency department.';
  if (cc === 'GB') return '**Emergency:** Call **999** or **112**.';
  if (cc === 'IE') return '**Emergency:** Call **112/999**.';
  if (cc === 'AU') return '**Emergency:** Call **000**.';
  if (EU_COUNTRIES.has(cc)) return '**Emergency:** Call **112** (EU).';
  return '**Emergency:** Call your local emergency number or go to the nearest hospital.';
};

// ---------- Canonical Resources (verified) ----------
const CA_988 = { name: '9-8-8 Suicide Crisis Helpline', phone: '988', text: '988', hours: '24/7', site: 'https://988.ca' };
const US_988 = { name: '988 Suicide & Crisis Lifeline', phone: '988', text: '988', hours: '24/7', site: 'https://988lifeline.org' };

const KIDS_HELP = { name: 'Kids Help Phone (under 29)', phone: '1-800-668-6868', text: 'Text CONNECT to 686868', hours: '24/7', site: 'https://kidshelpphone.ca' };
const HOPE_WELLNESS = { name: 'Hope for Wellness (Indigenous, Canada)', phone: '1-855-242-3310', chat: 'hopeforwellness.ca', hours: '24/7', site: 'https://www.hopeforwellness.ca' };

const UK_SAMARITANS = { name: 'Samaritans', phone: '116 123', hours: '24/7', site: 'https://www.samaritans.org' };
const UK_SHOUT = { name: 'Shout (text)', text: 'Text SHOUT to 85258', hours: '24/7', site: 'https://giveusashout.org' };

const IE_SAMARITANS = { name: 'Samaritans', phone: '116 123', hours: '24/7', site: 'https://www.samaritans.org/ireland' };
const IE_50808 = { name: '50808 (text)', text: 'Text HELLO to 50808', hours: '24/7', site: 'https://www.textaboutit.ie' };

const AU_LIFELINE = { name: 'Lifeline', phone: '13 11 14', text: 'Text 0477 13 11 14', hours: '24/7', site: 'https://www.lifeline.org.au' };

const BEFRIENDERS = { name: 'Befrienders Worldwide', directory: 'befrienders.org', hours: 'Varies', site: 'https://www.befrienders.org' };

// Provincial highlights (keep it minimal + reliable)
const PROVINCIAL = {
  ON: { name: 'Ontario (ConnexOntario)', phone: '1-866-531-2600', site: 'https://connexontario.ca' },
  BC: { name: 'British Columbia – 1-800-SUICIDE', phone: '1-800-784-2433', alt: '310-6789 (no area code, BC)', site: 'https://www.crisiscentre.bc.ca' },
  QC: { name: 'Québec – 1 866 APPELLE', phone: '1-866-277-3553', site: 'https://suicide.ca' },
  MB: { name: 'Manitoba – Klinic Crisis Line', phone: '1-888-322-3019', local: '204-786-8686', site: 'https://klinic.mb.ca' }
  // Add more provinces/territories here as needed
};

// ---------- Location Detection ----------
export const detectUserLocation = async () => {
  try {
    // Check if we're online
    if (!navigator.onLine) {
      console.log('Offline mode: defaulting to Canada');
      return { country: 'CA', province: null, city: null, offline: true };
    }

    // Prefer IP-based lookup first (privacy-friendly)
    const fromIP = await getLocationFromIP();
    if (fromIP?.country) return fromIP;

    // If you explicitly ask for precise GPS elsewhere in your app, you can call a GPS variant.
    return { country: 'CA', province: null, city: null };
  } catch (err) {
    console.error('Location detection failed:', err);
    // Offline or network error - default to Canada
    return { country: 'CA', province: null, city: null, offline: true };
  }
};

const getLocationFromIP = async () => {
  try {
    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500); // 2.5 second timeout

    const res = await fetch('https://ipapi.co/json/', {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const data = await res.json();
    return {
      country: data?.country_code || null,
      province: normalizeProvince(data?.region_code || data?.region),
      city: data?.city || null,
      timezone: data?.timezone || null
    };
  } catch (err) {
    console.error('IP location failed:', err);
    throw err; // Re-throw to trigger fallback
  }
};

// ---------- Resource Selection ----------
export const getCrisisResources = (location) => {
  const country = (location?.country || '').toUpperCase();
  const province = normalizeProvince(location?.province);

  // Canada
  if (country === 'CA') {
    const provincial = province && PROVINCIAL[province] ? PROVINCIAL[province] : null;
    return {
      country,
      primary: CA_988, // call or text 988
      specials: [KIDS_HELP, HOPE_WELLNESS],
      provincial,
      offline: location?.offline || false
    };
  }

  // United States
  if (country === 'US') {
    return {
      country,
      primary: US_988,
      specials: [],
      provincial: null,
      offline: location?.offline || false
    };
  }

  // United Kingdom
  if (country === 'GB' || country === 'UK') {
    return {
      country: 'GB',
      primary: UK_SAMARITANS,
      specials: [UK_SHOUT],
      provincial: null,
      offline: location?.offline || false
    };
  }

  // Ireland
  if (country === 'IE') {
    return {
      country,
      primary: IE_SAMARITANS,
      specials: [IE_50808],
      provincial: null,
      offline: location?.offline || false
    };
  }

  // Australia
  if (country === 'AU') {
    return {
      country,
      primary: AU_LIFELINE,
      specials: [],
      provincial: null,
      offline: location?.offline || false
    };
  }

  // Everything else → trusted directory
  return {
    country: country || 'INTL',
    primary: null,
    specials: [],
    directory: BEFRIENDERS,
    offline: location?.offline || false
  };
};

// ---------- Formatter (short, skimmable) ----------
export const formatCrisisResources = (resources, location) => {
  const parts = [];
  const bullets = [];
  let hasGuaranteed247 = false;

  // Add offline notice if applicable
  if (resources.offline) {
    parts.push('⚠️ **No internet connection detected.** Using basic crisis resources.\n');
  }

  parts.push('🚨 **IMMEDIATE SAFETY:**\nIf you are in immediate danger, call your local emergency number right now.\n');

  // Country-specific
  if (resources.primary) {
    const p = resources.primary;
    hasGuaranteed247 = yes247(p.hours?.includes('24/7'));
    const line = [
      `**${p.name}:**`,
      p.phone ? `Call **${p.phone}**` : null,
      p.text ? `or text **${p.text}**` : null,
      p.hours ? `(${p.hours})` : null
    ].filter(Boolean).join(' ');
    bullets.push(line);
  }

  // Specials (youth, Indigenous, text services)
  for (const s of resources.specials || []) {
    if (s.hours?.includes('24/7')) hasGuaranteed247 = true;
    const line = [
      `**${s.name}:**`,
      s.phone ? `Call **${s.phone}**` : null,
      s.text ? `or ${s.text}` : null,
      s.chat ? `or chat at **${s.chat}**` : null,
      s.hours ? `(${s.hours})` : null
    ].filter(Boolean).join(' ');
    bullets.push(line);
  }

  // Provincial (Canada)
  if (resources.provincial) {
    const pr = resources.provincial;
    const extras = pr.alt ? `; ${pr.alt}` : pr.local ? `; local ${pr.local}` : '';
    bullets.push(`**${pr.name}:** Call **${pr.phone}**${extras}`);
  }

  // International directory fallback
  if (!resources.primary && resources.directory) {
    bullets.push(`**${resources.directory.name}:** find your local helpline at **${resources.directory.directory}**`);
  }

  // Assemble
  if (bullets.length) {
    parts.push(bullets.map(b => `• ${b}`).join('\n'));
  }

  // Emergency footer (regional with EU 112 support)
  const country = (location?.country || '').toUpperCase();
  parts.push('\n' + emergencyFooter(country));

  return { message: parts.join('\n'), hasGuaranteed247 };
};
