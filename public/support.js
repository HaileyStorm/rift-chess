document.addEventListener('click', (event) => {
  if (!event.isTrusted || event.defaultPrevented || event.button !== 0) return;
  if (!(event.target instanceof Element)) return;

  const link = event.target.closest('a[data-rift-external]');
  if (!link || !window.riftDesktop?.openExternal) return;

  event.preventDefault();
  void window.riftDesktop.openExternal(link.href);
});
