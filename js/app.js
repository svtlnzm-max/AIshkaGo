/**
 * app.js — точка входа приложения.
 * Здесь: общее состояние (AppState), запуск Telegram SDK, привязка кликов
 * ко всем data-action на странице и первый переход на нужный экран.
 */

// Общее состояние приложения на время сессии (не персистентное между перезапусками —
// для реального продакшена заказы должны храниться на бэкенде, а не в памяти вкладки)
const AppState = {
  orders: [],       // заказы, оформленные в этой сессии (плюс MOCK_ORDERS из data.js для демо-истории)
  draftBrief: {},   // черновик текущей заявки: serviceId, description, urgency, price, fileName
};

document.addEventListener('DOMContentLoaded', () => {
  tgInit();

  const container = document.getElementById('screen-container');
  const tabbar = document.getElementById('tabbar');

  wireTabbar(tabbar);
  wireGlobalActions(container);
  wireTouchFeedback();

  // Экран приветствия показываем только при первом запуске
  loadDraft('welcome_seen', (seen) => {
    Router.stack = [{ screen: seen ? 'catalog' : 'welcome', params: {} }];
    Router.init(container, tabbar);
    // Оффер показываем поверх первого экрана (тоже только один раз, см. offer.js)
    initOfferModal();
  });
});

/** Клики по нижнему таббару (Каталог / Мои заказы / Профиль) */
function wireTabbar(tabbar) {
  tabbar.addEventListener('click', (e) => {
    const btn = e.target.closest('.tab');
    if (!btn) return;
    hapticTap();
    Router.navigate(btn.dataset.tab);
  });
}

/**
 * Единый обработчик кликов по всем data-action внутри экранов.
 * Действия, специфичные для конкретного экрана и требующие доступа к его
 * локальным переменным (attach-file, select-urgency), вешаются напрямую
 * в onEnter соответствующего экрана в screens.js — сюда попадают только
 * "простые" переходы и общие действия.
 */
function wireGlobalActions(container) {
  container.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const action = el.dataset.action;

    switch (action) {
      case 'open-category':
        hapticTap();
        Router.navigate('category', { categoryId: el.dataset.id });
        break;

      case 'open-service':
        hapticTap();
        Router.navigate('service', { serviceId: el.dataset.id });
        break;

      case 'open-order': {
        hapticTap();
        const order = findOrder(el.dataset.id);
        Router.navigate(order.stepIndex === 3 ? 'result' : 'status', { orderId: el.dataset.id });
        break;
      }

      case 'go-orders':
        hapticTap();
        Router.navigate('orders');
        break;

      case 'open-about':
        hapticTap();
        Router.navigate('about');
        break;

      case 'open-support':
        openSupportChat();
        break;

      case 'share-result':
        hapticTap();
        shareResult(`Посмотрите, что сделала ${BRAND.name}: ${el.dataset.service}`);
        break;

      case 'order-again':
        hapticTap();
        Router.navigate('catalog');
        break;

      // 'attach-file' и 'select-urgency' обрабатываются внутри BriefScreen.onEnter
      default:
        break;
    }
  });
}

/**
 * Мгновенная визуальная реакция на касание (.tappable) через touchstart/touchend,
 * а не только CSS :active — на части мобильных WebView :active срабатывает с задержкой.
 */
function wireTouchFeedback() {
  document.addEventListener('touchstart', (e) => {
    const el = e.target.closest('.tappable');
    if (el) el.classList.add('is-pressed');
  }, { passive: true });
  ['touchend', 'touchcancel'].forEach((evt) => {
    document.addEventListener(evt, (e) => {
      const el = e.target.closest('.tappable');
      if (el) el.classList.remove('is-pressed');
    }, { passive: true });
  });
}

function openSupportChat() {
  hapticTap();
  const username = BRAND.supportBotUsername.replace('@', '');
  if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.openTelegramLink) {
    window.Telegram.WebApp.openTelegramLink(`https://t.me/${username}`);
  } else {
    showAlert(`Напишите нам: ${BRAND.supportBotUsername}`);
  }
}
