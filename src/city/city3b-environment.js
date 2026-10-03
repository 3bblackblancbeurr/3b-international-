export function cityIsNight(city, hour = new Date().getHours()) {
  return city?.day_mode === 'night' || (city?.day_mode === 'auto' && (hour >= 20 || hour < 7));
}

// The editor remains readable at dawn; an explicitly selected night remains available.
export const cityConstructionIsNight=city=>city?.day_mode==='night';
