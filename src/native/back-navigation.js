// Keep navigation independent from the native bridge so it can be verified on Node.
export function closeActiveDialog(document, dispatchEscape) {
  const dialog = document.querySelector('dialog[open]');
  if (dialog) {
    if (dialog.dispatchEvent(new Event('cancel', { cancelable: true }))) dialog.close();
    return true;
  }
  if (document.querySelector('.gm-modal[role="dialog"][aria-modal="true"]')) {
    dispatchEscape();
    return true;
  }
  return false;
}

export function handleNativeBack({ canGoBack, closeDialog, back, page, home, exit }) {
  if (closeDialog()) return 'dialog';
  if (canGoBack) { back(); return 'back'; }
  if (!['intro', 'home'].includes(page)) { home(); return 'home'; }
  exit();
  return 'exit';
}
