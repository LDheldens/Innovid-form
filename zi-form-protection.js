
(function () {
  'use strict';

  // ─── CONFIGURACIÓN ───────────────────────────────────────────────
  // Vacío = se ejecuta en TODAS las páginas
  // Con rutas = solo en esas páginas: ['/contact', '/demo']
  var ACTIVE_PATHS = [];

  // Fragmento de URL que identifica el script de ZoomInfo
  var ZI_SCRIPT_DOMAIN = 'zoominfo.com';

  // Tiempo máximo de espera antes de mostrar el form igual (ms)
  var TIMEOUT_MS = 4500;

  // Intervalo de polling (ms)
  var POLL_INTERVAL_MS = 100;

  // Color del spinner
  var SPINNER_COLOR = '#414bf9';
  // ─────────────────────────────────────────────────────────────────

  // Verificar si esta página debe ejecutar la lógica
  function isActivePage() {
    if (ACTIVE_PATHS.length === 0) return true;
    var path = window.location.pathname;
    return ACTIVE_PATHS.some(function (p) { return path.indexOf(p) === 0; });
  }

  // Revelar wrapper y eliminar spinner
  function revealWrapper(wrapper) {
    try {
      wrapper.classList.add('zi-ready');
      var overlay = wrapper.querySelector('.zi-overlay');
      if (overlay) {
        overlay.style.transition = 'opacity 0.3s ease';
        overlay.style.opacity = '0';
        setTimeout(function () {
          if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        }, 300);
      }
    } catch (e) {
      try { wrapper.classList.add('zi-ready'); } catch (e2) {}
    }
  }

  // Agregar spinner al wrapper
  function addSpinner(wrapper) {
    try {
      if (wrapper.querySelector('.zi-overlay')) return;

      // Inyectar keyframes solo una vez
      if (!document.getElementById('zi-spin-style')) {
        var s = document.createElement('style');
        s.id = 'zi-spin-style';
        s.textContent = '@keyframes zi-spin { to { transform: rotate(360deg); } }';
        document.head.appendChild(s);
      }

      var overlay = document.createElement('div');
      overlay.className = 'zi-overlay';
      overlay.style.cssText = [
        'position:absolute',
        'inset:0',
        'display:flex',
        'flex-direction:column',
        'align-items:center',
        'justify-content:center',
        'background:rgba(255,255,255,0.95)',
        'z-index:9999',
        'border-radius:8px',
        'gap:12px'
      ].join(';');

      overlay.innerHTML =
        '<div style="width:40px;height:40px;border:3px solid #e0e0e0;border-top-color:' + SPINNER_COLOR + ';border-radius:50%;animation:zi-spin 0.75s linear infinite"></div>' +
        '<span style="font-size:13px;color:#888;font-family:sans-serif">Loading form...</span>';

      wrapper.appendChild(overlay);
    } catch (e) {}
  }

  // Detectar si el script de ZoomInfo ya fue insertado en el DOM
  function isZILoaded() {
    return Array.from(document.querySelectorAll('script[src]'))
      .some(function (s) { return s.src.indexOf(ZI_SCRIPT_DOMAIN) !== -1; });
  }

  // Esperar a que ZoomInfo se descargue, luego revelar
  function waitForZI(wrapper) {
    var start = Date.now();

    function check() {
      try {
        if (isZILoaded()) {
          // ZoomInfo ya está en el DOM y ejecutándose
          // Pequeño delay para que termine de procesar el form
          setTimeout(function () { revealWrapper(wrapper); }, 150);
          return;
        }
        if (Date.now() - start >= TIMEOUT_MS) {
          // Timeout: ZoomInfo no llegó (bloqueado o no aplica)
          revealWrapper(wrapper);
          return;
        }
        setTimeout(check, POLL_INTERVAL_MS);
      } catch (e) {
        revealWrapper(wrapper);
      }
    }

    check();
  }

  // Esperar a que Marketo renderice el <form> dentro del wrapper
  function waitForMarketo(wrapper) {
    var start = Date.now();

    function check() {
      try {
        var form = wrapper.querySelector('form');
        if (form) {
          // Form de Marketo listo, ahora esperamos ZoomInfo
          waitForZI(wrapper);
          return;
        }
        if (Date.now() - start >= TIMEOUT_MS) {
          revealWrapper(wrapper);
          return;
        }
        setTimeout(check, POLL_INTERVAL_MS);
      } catch (e) {
        revealWrapper(wrapper);
      }
    }

    check();
  }

  // Inicializar un wrapper individual
  function initWrapper(wrapper) {
    try {
      if (wrapper.hasAttribute('data-zi-init')) return;
      wrapper.setAttribute('data-zi-init', '1');
      addSpinner(wrapper);
      waitForMarketo(wrapper);
    } catch (e) {
      revealWrapper(wrapper);
    }
  }

  // Inicialización principal
  function init() {
    try {
      if (!isActivePage()) {
        // Esta página no está en ACTIVE_PATHS: revelar todo inmediatamente
        document.querySelectorAll('.marketoform_wrapper').forEach(function (w) {
          w.classList.add('zi-ready');
        });
        return;
      }

      // Procesar wrappers ya presentes en el DOM
      document.querySelectorAll('.marketoform_wrapper').forEach(function (w) {
        initWrapper(w);
      });

      // Detectar wrappers que aparezcan después (modales, lazy load)
      var observer = new MutationObserver(function (mutations) {
        try {
          mutations.forEach(function (mutation) {
            mutation.addedNodes.forEach(function (node) {
              if (node.nodeType !== 1) return;
              if (node.classList && node.classList.contains('marketoform_wrapper')) {
                initWrapper(node);
              }
              if (node.querySelectorAll) {
                node.querySelectorAll('.marketoform_wrapper').forEach(function (w) {
                  initWrapper(w);
                });
              }
            });
          });
        } catch (e) {}
      });

      observer.observe(document.body, { childList: true, subtree: true });

    } catch (e) {
      // Si todo falla, al menos revelar los forms
      try {
        document.querySelectorAll('.marketoform_wrapper').forEach(function (w) {
          w.classList.add('zi-ready');
        });
      } catch (e2) {}
    }
  }

  // Arrancar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
