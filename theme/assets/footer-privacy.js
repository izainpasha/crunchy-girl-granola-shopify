document.addEventListener('DOMContentLoaded', () => {
  const dialog = document.querySelector('[data-footer-privacy-dialog]');
  const openButton = document.querySelector('[data-footer-privacy-open]');
  const closeButton = document.querySelector('[data-footer-privacy-close]');

  if (!dialog || !openButton || !closeButton) return;

  openButton.addEventListener('click', () => dialog.showModal());
  closeButton.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
});
