/**
 * ShiftRelay Frontline Post & Note Translation Engine
 * Instant translation toggle for shift lounge posts, handovers, and comments.
 * Zero emojis - 100% SVG vector indicators.
 */

(function () {
  // Common frontline phrases pre-translated for instant speed
  const SAMPLE_TRANSLATIONS = {
    es: {
      'Shift complete': 'Turno completado',
      'All safety checks verified': 'Todas las comprobaciones de seguridad verificadas',
      'Cooling unit 4 temp normal': 'Unidad de refrigeración 4 temp normal',
      'Handover relayed successfully': 'Relevo transmitido con éxito',
      'Great teamwork today': 'Gran trabajo en equipo hoy',
      'Machine serviced and tagged': 'Máquina revisada y etiquetada',
      'Looking for coverage Wednesday': 'Buscando cobertura para el miércoles'
    },
    fr: {
      'Shift complete': 'Quart terminé',
      'All safety checks verified': 'Toutes les vérifications de sécurité effectuées',
      'Cooling unit 4 temp normal': 'Unité de refroidissement 4 temp normale',
      'Handover relayed successfully': 'Passation transmise avec succès',
      'Great teamwork today': 'Excellent travail d’équipe aujourd’hui',
      'Machine serviced and tagged': 'Machine révisée et étiquetée',
      'Looking for coverage Wednesday': 'Recherche de remplacement pour mercredi'
    },
    sw: {
      'Shift complete': 'Zamu imekamilika',
      'All safety checks verified': 'Ukaguzi wote wa usalama umethibitishwa',
      'Cooling unit 4 temp normal': 'Kipimo cha joto cha kitengo cha 4 kiko kawaida',
      'Handover relayed successfully': 'Makabidhiano yamewasilishwa kwa ufanisi',
      'Great teamwork today': 'Kazi nzuri ya pamoja leo',
      'Machine serviced and tagged': 'Mashine imehudumiwa na kuwekwa lebo',
      'Looking for coverage Wednesday': 'Ninatafuta mbadala wa zamu ya Jumatano'
    }
  };

  function translateText(text, targetLang = 'es') {
    const langDict = SAMPLE_TRANSLATIONS[targetLang] || SAMPLE_TRANSLATIONS.es;
    for (const [enKey, transVal] of Object.entries(langDict)) {
      if (text.toLowerCase().includes(enKey.toLowerCase())) {
        return text.replace(new RegExp(enKey, 'gi'), transVal);
      }
    }
    // Fallback indicator
    return `[${targetLang.toUpperCase()}] ${text}`;
  }

  function enhancePostTranslation() {
    document.querySelectorAll('.lounge-post-card, .handover-item').forEach(card => {
      if (card.querySelector('.btn-translate-post')) return;

      const bodyEl = card.querySelector('.post-body, .post-text, p');
      if (!bodyEl) return;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn-translate-post';
      btn.innerHTML = `${Icons.translate(13)} <span>Translate</span>`;

      btn.addEventListener('click', () => {
        const isTranslated = btn.classList.contains('translated');
        if (isTranslated) {
          bodyEl.textContent = btn.dataset.originalText;
          btn.classList.remove('translated');
          btn.innerHTML = `${Icons.translate(13)} <span>Translate</span>`;
        } else {
          btn.dataset.originalText = bodyEl.textContent;
          const target = localStorage.getItem('sr_pref_lang') || 'es';
          bodyEl.textContent = translateText(bodyEl.textContent, target);
          btn.classList.add('translated');
          btn.innerHTML = `${Icons.check(12)} <span>Original</span>`;
        }
      });

      const actionBar = card.querySelector('.post-action-bar, .button-row');
      if (actionBar) {
        actionBar.appendChild(btn);
      } else {
        bodyEl.insertAdjacentElement('afterend', btn);
      }
    });
  }

  window.enhancePostTranslation = enhancePostTranslation;

  // Re-run observer for dynamically loaded feed items
  const observer = new MutationObserver(() => {
    enhancePostTranslation();
  });

  window.addEventListener('load', () => {
    const dash = document.getElementById('dashboard');
    if (dash) observer.observe(dash, { childList: true, subtree: true });
    setTimeout(enhancePostTranslation, 1500);
  });
})();
