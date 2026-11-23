// Countries with their ISO codes (the code narrows the city search to that country).
export const COUNTRIES = [
  ['Afghanistan', 'AF'], ['Albania', 'AL'], ['Algeria', 'DZ'], ['Andorra', 'AD'], ['Angola', 'AO'], ['Argentina', 'AR'], ['Armenia', 'AM'], ['Australia', 'AU'],
  ['Austria', 'AT'], ['Azerbaijan', 'AZ'], ['Bahamas', 'BS'], ['Bahrain', 'BH'], ['Bangladesh', 'BD'], ['Barbados', 'BB'], ['Belarus', 'BY'], ['Belgium', 'BE'],
  ['Belize', 'BZ'], ['Benin', 'BJ'], ['Bhutan', 'BT'], ['Bolivia', 'BO'], ['Bosnia and Herzegovina', 'BA'], ['Botswana', 'BW'], ['Brazil', 'BR'], ['Brunei', 'BN'],
  ['Bulgaria', 'BG'], ['Burkina Faso', 'BF'], ['Burundi', 'BI'], ['Cambodia', 'KH'], ['Cameroon', 'CM'], ['Canada', 'CA'], ['Cape Verde', 'CV'], ['Chad', 'TD'],
  ['Chile', 'CL'], ['China', 'CN'], ['Colombia', 'CO'], ['Costa Rica', 'CR'], ['Croatia', 'HR'], ['Cuba', 'CU'], ['Curaçao', 'CW'], ['Cyprus', 'CY'],
  ['Czechia', 'CZ'], ['Denmark', 'DK'], ['Dominican Republic', 'DO'], ['Ecuador', 'EC'], ['Egypt', 'EG'], ['El Salvador', 'SV'], ['Estonia', 'EE'], ['Ethiopia', 'ET'],
  ['Fiji', 'FJ'], ['Finland', 'FI'], ['France', 'FR'], ['Gabon', 'GA'], ['Georgia', 'GE'], ['Germany', 'DE'], ['Ghana', 'GH'], ['Greece', 'GR'],
  ['Guatemala', 'GT'], ['Guinea', 'GN'], ['Haiti', 'HT'], ['Honduras', 'HN'], ['Hong Kong', 'HK'], ['Hungary', 'HU'], ['Iceland', 'IS'], ['India', 'IN'],
  ['Indonesia', 'ID'], ['Iran', 'IR'], ['Iraq', 'IQ'], ['Ireland', 'IE'], ['Israel', 'IL'], ['Italy', 'IT'], ['Ivory Coast', 'CI'], ['Jamaica', 'JM'],
  ['Japan', 'JP'], ['Jordan', 'JO'], ['Kazakhstan', 'KZ'], ['Kenya', 'KE'], ['Kosovo', 'XK'], ['Kuwait', 'KW'], ['Kyrgyzstan', 'KG'], ['Laos', 'LA'],
  ['Latvia', 'LV'], ['Lebanon', 'LB'], ['Libya', 'LY'], ['Liechtenstein', 'LI'], ['Lithuania', 'LT'], ['Luxembourg', 'LU'], ['Madagascar', 'MG'], ['Malaysia', 'MY'],
  ['Maldives', 'MV'], ['Mali', 'ML'], ['Malta', 'MT'], ['Mauritius', 'MU'], ['Mexico', 'MX'], ['Moldova', 'MD'], ['Monaco', 'MC'], ['Mongolia', 'MN'],
  ['Montenegro', 'ME'], ['Morocco', 'MA'], ['Mozambique', 'MZ'], ['Myanmar', 'MM'], ['Namibia', 'NA'], ['Nepal', 'NP'], ['Netherlands', 'NL'], ['New Zealand', 'NZ'],
  ['Nicaragua', 'NI'], ['Niger', 'NE'], ['Nigeria', 'NG'], ['North Macedonia', 'MK'], ['Norway', 'NO'], ['Oman', 'OM'], ['Pakistan', 'PK'], ['Panama', 'PA'],
  ['Paraguay', 'PY'], ['Peru', 'PE'], ['Philippines', 'PH'], ['Poland', 'PL'], ['Portugal', 'PT'], ['Puerto Rico', 'PR'], ['Qatar', 'QA'], ['Romania', 'RO'],
  ['Russia', 'RU'], ['Rwanda', 'RW'], ['Saudi Arabia', 'SA'], ['Senegal', 'SN'], ['Serbia', 'RS'], ['Singapore', 'SG'], ['Slovakia', 'SK'], ['Slovenia', 'SI'],
  ['South Africa', 'ZA'], ['South Korea', 'KR'], ['Spain', 'ES'], ['Sri Lanka', 'LK'], ['Sudan', 'SD'], ['Suriname', 'SR'], ['Sweden', 'SE'], ['Switzerland', 'CH'],
  ['Syria', 'SY'], ['Taiwan', 'TW'], ['Tanzania', 'TZ'], ['Thailand', 'TH'], ['Trinidad and Tobago', 'TT'], ['Tunisia', 'TN'], ['Turkey', 'TR'], ['Uganda', 'UG'],
  ['Ukraine', 'UA'], ['United Arab Emirates', 'AE'], ['United Kingdom', 'GB'], ['United States', 'US'], ['Uruguay', 'UY'], ['Uzbekistan', 'UZ'], ['Venezuela', 'VE'], ['Vietnam', 'VN'],
  ['Yemen', 'YE'], ['Zambia', 'ZM'], ['Zimbabwe', 'ZW'],
];

export const POPULAR = ['Netherlands', 'Belgium', 'Germany', 'United Kingdom', 'France', 'Spain'];

export const countryCode = (name) => COUNTRIES.find(([n]) => n.toLowerCase() === (name || '').trim().toLowerCase())?.[1] || null;

/** Countries matching what was typed: names starting with it first, then names containing it. */
export function searchCountries(q, limit = 6) {
  const t = q.trim().toLowerCase();
  if (!t) return POPULAR;
  const starts = COUNTRIES.filter(([n]) => n.toLowerCase().startsWith(t)).map(([n]) => n);
  const has = COUNTRIES.filter(([n]) => !n.toLowerCase().startsWith(t) && n.toLowerCase().includes(t)).map(([n]) => n);
  return [...starts, ...has].slice(0, limit);
}

/** Cities from Open-Meteo's free place search (only the typed letters are sent). */
export async function searchCities(q, code) {
  const t = q.trim();
  if (t.length < 2) return [];
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(t)}&count=10&language=en&format=json${code ? `&countryCode=${code}` : ''}`;
  try {
    const res = await fetch(url);
    const json = await res.json();
    const seen = new Set();
    return (json.results || [])
      .filter((r) => /^PPL(A\d?|C)?$/.test(r.feature_code || 'PPL'))
      .map((r) => ({ name: r.name, region: r.admin1 || '', country: r.country || '' }))
      .filter((r) => (seen.has(`${r.name}|${r.region}`) ? false : seen.add(`${r.name}|${r.region}`)))
      .slice(0, 6);
  } catch {
    return [];
  }
}
