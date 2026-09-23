/**
 * offer.js — модалка с оффером (скидка за подписку на бота).
 * Показывается один раз при первом открытии приложения, флаг — в localStorage
 * (не в CloudStorage/telegram.js-хранилище: это разовая пометка именно
 * браузера/устройства, а не данные, которые нужно синхронизировать через Telegram).
 */

const OFFER_SEEN_KEY = 'offer_seen';

function initOfferModal() {
  let alreadySeen = false;
  try {
    alreadySeen = localStorage.getItem(OFFER_SEEN_KEY) === '1';
  } catch (e) {
    // приватный режим браузера / localStorage недоступен — просто не показываем повторно за сессию
    alreadySeen = true;
  }
  if (alreadySeen) return;

  const overlay = document.createElement('div');
  overlay.className = 'offer-overlay';
  overlay.innerHTML = `
    <div class="offer-card">
      <span class="offer-emoji">${OFFER.emoji}</span>
      <h2 class="offer-title">${OFFER.title}</h2>
      <p class="offer-subtitle">${OFFER.subtitle}</p>
      <ul class="offer-bullets">
        ${OFFER.bullets.map((b) => `<li>${b}</li>`).join('')}
      </ul>
      <button class="offer-button tappable" data-action="offer-cta">${OFFER.buttonText}</button>
      <button class="offer-skip tappable" data-action="offer-skip">Пропустить</button>
    </div>`;
  document.body.appendChild(overlay);

  function dismiss() {
    try { localStorage.setItem(OFFER_SEEN_KEY, '1'); } catch (e) { /* приватный режим — молча игнорируем */ }
    overlay.classList.add('is-closing');
    setTimeout(() => overlay.remove(), 200);
  }

  overlay.querySelector('[data-action="offer-cta"]').addEventListener('click', () => {
    hapticTap();
    openTelegramLink(OFFER.link);
    dismiss();
  });
  overlay.querySelector('[data-action="offer-skip"]').addEventListener('click', () => {
    hapticTap();
    dismiss();
  });
}
