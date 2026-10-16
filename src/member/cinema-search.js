/** Search only within official film services. No copyrighted film data is scraped or hosted. */
export function cinemaSearchLinks(input='') {
  const title=String(input||'').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,80);
  const arte=new URL(title?'https://www.arte.tv/fr/search/':'https://www.arte.tv/fr/videos/cinema/films/');
  const france=new URL(title?'https://www.france.tv/recherche/':'https://www.france.tv/');
  if(title){
    arte.searchParams.set('q',title);
    arte.searchParams.set('genre','movies');
    france.searchParams.set('q',title);
  }
  return {title,arte:arte.href,france:france.href};
}
