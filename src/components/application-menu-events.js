export const APP_MENU_REQUEST = 'threeb:open-app-menu';
export const APP_MENU_STATE = 'threeb:app-menu-state';
export function openApplicationMenu(category = 'principal') {
  window.dispatchEvent(new CustomEvent(APP_MENU_REQUEST, {detail: {category}}));
}
