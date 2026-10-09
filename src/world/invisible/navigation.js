export const INVISIBLE_VIEWS = ['adventure', 'realms', 'journal', 'missions'];

export function readInvisibleView(location) {
  if (location.hash !== '#monde-invisible') return 'adventure';
  const view = new URLSearchParams(location.search || '').get('invisibleView');
  return INVISIBLE_VIEWS.includes(view) ? view : 'adventure';
}

export function invisibleViewHref(view, location) {
  const url = new URL(location.href);
  if (!INVISIBLE_VIEWS.includes(view) || view === 'adventure') url.searchParams.delete('invisibleView');
  else url.searchParams.set('invisibleView', view);
  url.hash = 'monde-invisible';
  return `${url.pathname}${url.search}${url.hash}`;
}
