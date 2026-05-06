/**
 * Opens a URL in the system browser.
 * Reliable for iOS PWA standalone mode where target="_blank" is ignored.
 */
export function openExternal(url) {
  if (!url) return;
  window.open(url, '_blank', 'noopener,noreferrer');
}
