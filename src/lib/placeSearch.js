const GEOAPIFY_KEY = import.meta.env.VITE_GEOAPIFY_API_KEY;

export function canSearchPlace(query) {
  const text = query.trim();
  return Boolean(GEOAPIFY_KEY) && text.length >= (/[ก-๙]/.test(text) ? 2 : 3);
}

export async function searchThaiPlaces(query, { position, signal } = {}) {
  const params = new URLSearchParams({
    text: query.trim(),
    lang: "th",
    format: "json",
    limit: "5",
    filter: "countrycode:th",
    apiKey: GEOAPIFY_KEY,
  });
  if (position) params.set("bias", `proximity:${position[1]},${position[0]}`);

  const response = await fetch(`https://api.geoapify.com/v1/geocode/autocomplete?${params}`, { signal });
  if (!response.ok) throw new Error("Place search failed");
  const data = await response.json();
  return data.results || [];
}
