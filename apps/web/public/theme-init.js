// Aplica o tema antes da renderização para evitar o "flash" de tema claro. Fica em um arquivo
// (e não inline no index.html) para que a política de segurança de conteúdo bloqueie scripts inline.
(function () {
  try {
    var stored = localStorage.getItem('nexus-theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (stored === 'dark' || ((!stored || stored === 'system') && prefersDark)) {
      document.documentElement.classList.add('dark');
    }
  } catch {
    // Sem acesso ao localStorage: segue o tema claro.
  }
})();
