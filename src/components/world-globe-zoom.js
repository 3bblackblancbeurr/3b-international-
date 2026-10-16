// Pure mobile-friendly zoom bounds for the interactive World 3B globe.
// Zoom is visual only; it never requests geolocation or extra assets.
export const GLOBE_ZOOM_MIN = 1;
export const GLOBE_ZOOM_MAX = 1.55;
export function clampGlobeZoom(value) {
 const n=Number(value);
 if(!Number.isFinite(n))return GLOBE_ZOOM_MIN;
 return Math.round(Math.max(GLOBE_ZOOM_MIN,Math.min(GLOBE_ZOOM_MAX,n))*100)/100;
}
