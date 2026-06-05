/* ============================================================
   page-transition.js
   Синхронизирует background на <html> и <body> при смене темы.
   Антивспышка решена инлайн-скриптом в каждом <head>.
   ============================================================ */
(function () {
  const DARK_BG  = '#0f0f10';
  const LIGHT_BG = '#f4f4f6';

  function applyBg(theme) {
    const bg = theme === 'light' ? LIGHT_BG : DARK_BG;
    document.documentElement.style.background = bg;
    if (document.body) document.body.style.background = bg;
  }

  /* Следим за data-theme на <html> — срабатывает при каждом applyTheme() */
  new MutationObserver(() => {
    applyBg(document.documentElement.getAttribute('data-theme') || 'dark');
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
})();
