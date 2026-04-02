/**
 * Режим вёрстки: плавающее окно (iframe на странице) vs попап панели.
 * Должен выполняться до первой отрисовки; внешний файл — из‑за CSP (script-src без inline).
 */
(function () {
  var embedByQuery = false;
  try {
    embedByQuery = new URLSearchParams(window.location.search || "").get("embed") === "1";
  } catch (e) {}
  var inIframe = false;
  try {
    inIframe = window.self !== window.top;
  } catch (e) {
    inIframe = true;
  }
  if (embedByQuery || inIframe) {
    document.documentElement.classList.add("hrhelper-embed");
  } else {
    document.documentElement.classList.add("hrhelper-popup");
  }
})();
