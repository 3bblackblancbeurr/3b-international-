// Mount outside transformed passport ancestors; clean up symmetrically on close.
export function mountNexusDialog(dialog, onClose) {
  const doc = dialog.ownerDocument;
  const previous = doc.activeElement;
  const scrollStyles = [doc.documentElement, doc.body].map(element => ({
    element, value: element.style.getPropertyValue('overflow'),
    priority: element.style.getPropertyPriority('overflow'),
  }));
  scrollStyles.forEach(({ element }) => element.style.setProperty('overflow', 'hidden'));
  const inertBefore = [];
  const focusables = () => [...dialog.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])')]
    .filter(element => element.tabIndex >= 0 && !element.closest('[inert]') && element.getClientRects().length);
  const first = () => focusables()[0] || dialog;
  const onKeyDown = event => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(); }
    if (event.key !== 'Tab') return;
    const items = focusables(), firstItem = items[0], lastItem = items.at(-1);
    if (!firstItem) { event.preventDefault(); dialog.focus(); return; }
    if (event.shiftKey && (doc.activeElement === firstItem || !items.includes(doc.activeElement))) {
      event.preventDefault(); lastItem.focus();
    } else if (!event.shiftKey && (doc.activeElement === lastItem || !items.includes(doc.activeElement))) {
      event.preventDefault(); firstItem.focus();
    }
  };
  const onFocus = event => { if (!dialog.contains(event.target)) first().focus({ preventScroll: true }); };
  const onCancel = event => { event.preventDefault(); onClose(); };
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else {
    dialog.setAttribute('open', '');
    for (const element of doc.body.children) {
      if (element === dialog || element.contains(dialog)) continue;
      inertBefore.push([element, element.hasAttribute('inert')]);
      element.setAttribute('inert', '');
    }
  }
  dialog.addEventListener('keydown', onKeyDown);
  dialog.addEventListener('cancel', onCancel);
  doc.addEventListener('focusin', onFocus);
  first().focus({ preventScroll: true });
  let disposed = false;
  return () => {
    if (disposed) return;
    disposed = true;
    dialog.removeEventListener('keydown', onKeyDown);
    dialog.removeEventListener('cancel', onCancel);
    doc.removeEventListener('focusin', onFocus);
    if (dialog.open && typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
    inertBefore.forEach(([element, wasInert]) => { if (!wasInert) element.removeAttribute('inert'); });
    scrollStyles.forEach(({ element, value, priority }) => {
      if (value) element.style.setProperty('overflow', value, priority);
      else element.style.removeProperty('overflow');
    });
    if (previous?.isConnected) previous.focus?.({ preventScroll: true });
  };
}
