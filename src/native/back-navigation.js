// Keep navigation independent from the native bridge so it can be verified on Node.
export function handleNativeBack({ canGoBack, closeDialog, back, page, home, exit }) {
  if (closeDialog()) return 'dialog';
  if (canGoBack) { back(); return 'back'; }
  if (!['intro', 'home'].includes(page)) { home(); return 'home'; }
  exit();
  return 'exit';
}
