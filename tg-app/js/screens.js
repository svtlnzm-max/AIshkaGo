/**
 * screens.js — разметка и поведение каждого экрана.
 *
 * Экран описывается объектом { render(params), onEnter(params), onLeave() }:
 *  - render(params)  — возвращает HTML-строку экрана (вызывается всегда);
 *  - onEnter(params) — вызывается после вставки экрана в DOM: здесь настраиваем
 *                       MainButton и вешаем обработчики, специфичные для экрана;
 *  - onLeave()        — вызывается перед уходом с экрана: прячем MainButton и т.п.
 *
 * Все экраны собраны в SCREEN_HANDLERS внизу файла — это и есть "карта экранов"
 * из brief.md в виде кода.
 */

/* ---------------------------- вспомогательные функции ---------------------------- */

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function formatPrice(n) {
  return n.toLocaleString('ru-RU') + ' ₽';
}

function findService(id) {
  return SERVICES.find((s) => s.id === id);
}
function findCategory(id) {
  return CATEGORIES.find((c) => c.id === id);
}

/** Круглая плашка-иконка с эмодзи — переиспользуется в карточках */
function iconCircle(emoji, color) {
  return `<span class="icon-circle" style="background:${color}22;color:${color}">${emoji}</span>`;
}

/** Визуальный блок "до / после" — заменяет реальное фото-портфолио в демо-версии */
function beforeAfterBlock(emoji, hueShift = 0) {
  return `
    <div class="before-after">
      <div class="ba-half ba-before" style="filter:grayscale(1) brightness(0.95)">
        <span>${emoji}</span>
        <span class="ba-tag">До</span>
      </div>
      <div class="ba-half ba-after" style="filter:hue-rotate(${hueShift}deg)">
        <span>${emoji}</span>
        <span class="ba-tag">После</span>
      </div>
    </div>`;
}

function serviceCardHtml(service) {
  const cat = findCategory(service.categoryId);
  return `
    <button class="service-card tappable" data-action="open-service" data-id="${service.id}">
      ${iconCircle(service.emoji, cat.color)}
      <span class="service-card-body">
        <span class="service-card-title">${service.title}</span>
        <span class="service-card-meta">${service.priceLabel} · ${service.duration}</span>
      </span>
      <span class="chevron">›</span>
    </button>`;
}

function statusBadge(stepIndex) {
  const label = STATUS_STEPS[stepIndex];
  const cls = stepIndex === 3 ? 'badge-done' : stepIndex === 0 ? 'badge-new' : 'badge-progress';
  return `<span class="badge ${cls}">${label}</span>`;
}

/* ---------------------------------- ЭКРАН: приветствие ---------------------------------- */

const WELCOME_BULLETS = [
  'Выбираете услугу — например, AI-фотосессию или дизайн презентации',
  'Описываете задачу или прикладываете фото — детали не нужны',
  'Получаете готовый результат прямо в Telegram',
];

const WelcomeScreen = {
  render() {
    const user = getUser();
    return `
      <div class="screen-pad welcome-screen">
        <div class="welcome-hero">${beforeAfterBlock('🖼️', 20)}</div>
        <h1 class="welcome-title">Привет, ${escapeHtml(user.first_name || 'Гость')}! 👋</h1>
        <p class="welcome-subtitle">${BRAND.welcomeSubtitle}</p>
        <ul class="feature-list welcome-bullets">
          ${WELCOME_BULLETS.map((b) => `<li>✅ ${b}</li>`).join('')}
        </ul>
      </div>`;
  },
  onEnter() {
    showMainButton('Начать', () => {
      hapticTap();
      saveDraft('welcome_seen', true);
      Router.navigate('catalog');
    });
  },
  onLeave() { hideMainButton(); },
};

/* ---------------------------------- ЭКРАН: каталог (главная) ---------------------------------- */

const CatalogScreen = {
  render() {
    const user = getUser();
    const popular = SERVICES.filter((s) => s.popular);
    return `
      <div class="screen-pad">
        <div class="catalog-header">
          <h1>Привет, ${escapeHtml(user.first_name || 'Гость')} 👋</h1>
          <p class="hint">Что будем делать сегодня?</p>
        </div>

        <div class="search-bar">
          <span class="search-icon">🔍</span>
          <input id="search-input" class="search-input" type="text" placeholder="Что нужно сделать?" />
        </div>

        <div id="catalog-default">
          <div class="category-grid">
            ${CATEGORIES.map((c) => `
              <button class="category-tile tappable" data-action="open-category" data-id="${c.id}" style="background:${c.color}18">
                <span class="category-emoji">${c.emoji}</span>
                <span class="category-title">${c.title}</span>
              </button>
            `).join('')}
          </div>

          <h2 class="section-title">Популярное</h2>
          <div class="service-list">
            ${popular.map(serviceCardHtml).join('')}
          </div>
        </div>

        <div id="catalog-search-results" class="service-list" style="display:none"></div>
      </div>`;
  },
  onEnter() {
    const input = document.getElementById('search-input');
    const defaultBlock = document.getElementById('catalog-default');
    const resultsBlock = document.getElementById('catalog-search-results');
    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      if (!q) {
        defaultBlock.style.display = '';
        resultsBlock.style.display = 'none';
        return;
      }
      const found = SERVICES.filter((s) => s.title.toLowerCase().includes(q));
      defaultBlock.style.display = 'none';
      resultsBlock.style.display = '';
      resultsBlock.innerHTML = found.length
        ? found.map(serviceCardHtml).join('')
        : `<p class="hint" style="padding:24px 0;text-align:center">Ничего не найдено — попробуйте другой запрос</p>`;
    });
  },
};

/* ---------------------------------- ЭКРАН: категория ---------------------------------- */

const CategoryScreen = {
  render(params) {
    const cat = findCategory(params.categoryId);
    const items = SERVICES.filter((s) => s.categoryId === params.categoryId);
    return `
      <div class="screen-pad">
        <h1 class="screen-title">${cat.emoji} ${cat.title}</h1>
        <div class="service-list">
          ${items.map(serviceCardHtml).join('')}
        </div>
      </div>`;
  },
};

/* ---------------------------------- ЭКРАН: карточка услуги ---------------------------------- */

const ServiceScreen = {
  render(params) {
    const s = findService(params.serviceId);
    return `
      <div class="gallery">
        ${[0, 40, 80].map((h) => `<div class="gallery-slide">${beforeAfterBlock(s.emoji, h)}</div>`).join('')}
      </div>
      <div class="screen-pad">
        <h1 class="screen-title">${s.title}</h1>
        <div class="service-price-row">
          <span class="service-price">${s.priceLabel}</span>
          <span class="dot">·</span>
          <span class="service-duration">${s.duration}</span>
        </div>
        <p class="service-description">${s.description}</p>
        <ul class="feature-list">
          ${s.features.map((f) => `<li>✅ ${f}</li>`).join('')}
        </ul>
      </div>`;
  },
  onEnter(params) {
    const s = findService(params.serviceId);
    showMainButton(`Заказать за ${formatPrice(s.price)}`, () => {
      hapticTap();
      Router.navigate('brief', { serviceId: s.id });
    });
  },
  onLeave() { hideMainButton(); },
};

/* ---------------------------------- ЭКРАН: бриф / заявка ---------------------------------- */

const URGENCY_OPTIONS = [
  { id: 'later', label: 'Не срочно', multiplier: 1 },
  { id: 'tomorrow', label: 'Завтра', multiplier: 1.15 },
  { id: 'today', label: 'Сегодня', multiplier: 1.3 },
];

const BriefScreen = {
  render(params) {
    const s = findService(params.serviceId);
    return `
      <div class="screen-pad">
        <h1 class="screen-title">${s.title}</h1>
        <p class="hint">Заполните заявку — этого достаточно, чтобы начать работу</p>

        <label class="field-label">Фото или файл (если есть)</label>
        <button class="attach-zone tappable" data-action="attach-file">
          <span id="attach-preview">📎 Прикрепить фото</span>
        </button>
        <input type="file" id="file-input" accept="image/*" style="display:none" />

        <label class="field-label">Опишите, что нужно</label>
        <textarea id="brief-description" class="textarea" rows="4"
          placeholder="Например: ${escapeHtml(s.features[0])}, в тёплых тонах, для профиля в Instagram">${escapeHtml(AppState.draftBrief.description || '')}</textarea>

        <label class="field-label">Когда нужно</label>
        <div class="chip-row" id="urgency-chips">
          ${URGENCY_OPTIONS.map((o) => `
            <button class="chip tappable ${AppState.draftBrief.urgency === o.id ? 'is-active' : ''}"
              data-action="select-urgency" data-value="${o.id}">${o.label}</button>
          `).join('')}
        </div>

        <div class="summary-row">
          <span>Итого</span>
          <span id="brief-total-price" class="summary-price">${formatPrice(s.price)}</span>
        </div>
      </div>`;
  },
  onEnter(params) {
    const s = findService(params.serviceId);
    // Если заявку начали для другой услуги (вернулись в каталог и выбрали другую) — сбрасываем черновик
    if (AppState.draftBrief.serviceId && AppState.draftBrief.serviceId !== s.id) {
      AppState.draftBrief = {};
    }
    AppState.draftBrief.serviceId = s.id;
    if (!AppState.draftBrief.urgency) AppState.draftBrief.urgency = 'later';

    const fileInput = document.getElementById('file-input');
    const attachBtn = document.querySelector('[data-action="attach-file"]');
    const preview = document.getElementById('attach-preview');
    const description = document.getElementById('brief-description');
    const totalPriceEl = document.getElementById('brief-total-price');
    const chips = document.querySelectorAll('#urgency-chips .chip');

    // Если файл уже был выбран ранее (вернулись назад с экрана оплаты) — покажем имя
    if (AppState.draftBrief.fileName) {
      preview.textContent = '📎 ' + AppState.draftBrief.fileName;
    }

    function recalcPrice() {
      const opt = URGENCY_OPTIONS.find((o) => o.id === AppState.draftBrief.urgency);
      const total = Math.round(s.price * opt.multiplier);
      AppState.draftBrief.price = total;
      totalPriceEl.textContent = formatPrice(total);
    }
    function syncMainButton() {
      const ready = (AppState.draftBrief.description || '').trim().length > 0;
      setMainButtonEnabled(ready);
    }

    attachBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (!file) return;
      AppState.draftBrief.fileName = file.name;
      // Содержимое файла храним только в памяти вкладки (не в CloudStorage —
      // там лимит 4096 символов на значение, для реального файла нужен отдельный аплоад на бэкенд)
      preview.textContent = '📎 ' + file.name;
      hapticTap();
    });

    description.addEventListener('input', () => {
      AppState.draftBrief.description = description.value;
      saveDraft('draft_brief', AppState.draftBrief);
      syncMainButton();
    });

    chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        hapticTap();
        AppState.draftBrief.urgency = chip.dataset.value;
        chips.forEach((c) => c.classList.toggle('is-active', c === chip));
        recalcPrice();
        saveDraft('draft_brief', AppState.draftBrief);
      });
    });

    recalcPrice();
    syncMainButton();

    showMainButton('Перейти к оплате', () => {
      if (!(AppState.draftBrief.description || '').trim()) return;
      hapticTap();
      Router.navigate('payment', { serviceId: s.id });
    });
  },
  onLeave() { hideMainButton(); },
};

/* ---------------------------------- ЭКРАН: оплата ---------------------------------- */

const PaymentScreen = {
  render(params) {
    const s = findService(params.serviceId);
    const opt = URGENCY_OPTIONS.find((o) => o.id === AppState.draftBrief.urgency);
    const price = AppState.draftBrief.price || s.price;
    return `
      <div class="screen-pad">
        <h1 class="screen-title">Проверьте заказ</h1>

        <div class="summary-card">
          <div class="summary-line"><span>Услуга</span><span>${s.title}</span></div>
          <div class="summary-line"><span>Срок</span><span>${opt.label.toLowerCase()}</span></div>
          ${AppState.draftBrief.fileName ? `<div class="summary-line"><span>Файл</span><span>${escapeHtml(AppState.draftBrief.fileName)}</span></div>` : ''}
          <div class="summary-line summary-total"><span>Итого</span><span>${formatPrice(price)}</span></div>
        </div>

        <p class="hint payment-hint">⭐ Оплата через Telegram Stars — безопасно, без выхода из приложения</p>
      </div>`;
  },
  onEnter(params) {
    const s = findService(params.serviceId);
    const price = AppState.draftBrief.price || s.price;
    // Демо-курс: 1 ₽ = 1 звезда. Реальный курс задаётся при создании инвойса на бэкенде (Bot API).
    showMainButton(`Оплатить ${price} ⭐`, () => {
      hapticTap();
      setMainButtonLoading(true);
      // Здесь в проде: tg.openInvoice(invoiceUrl, callback) со ссылкой от бэкенда.
      // В демо-версии без бэкенда имитируем успешную оплату:
      setTimeout(() => {
        setMainButtonLoading(false);
        hapticSuccess();
        const order = {
          id: 'ord-' + Math.floor(1000 + Math.random() * 9000),
          serviceId: s.id,
          createdAt: 'сегодня',
          stepIndex: 0,
          eta: `Обычно занимает ${s.duration}. Мы напишем, когда будет готово`,
        };
        AppState.orders.unshift(order);
        AppState.draftBrief = {};
        clearDraft('draft_brief');
        // Сворачиваем стек до "Мои заказы → Статус": так "Назад" ведёт к вкладкам,
        // а не обратно в форму брифа услуги, которую уже оплатили
        Router.resetStackTo([{ screen: 'orders', params: {} }, { screen: 'status', params: { orderId: order.id } }]);
      }, 1200);
    });
  },
  onLeave() { hideMainButton(); },
};

/* ---------------------------------- ЭКРАН: статус заказа ---------------------------------- */

function findOrder(orderId) {
  return AppState.orders.find((o) => o.id === orderId) || MOCK_ORDERS.find((o) => o.id === orderId);
}

const StatusScreen = {
  render(params) {
    const order = findOrder(params.orderId);
    const s = findService(order.serviceId);
    return `
      <div class="screen-pad">
        <h1 class="screen-title">${s.title}</h1>
        <p class="hint">Заказ №${order.id.replace('ord-', '')}</p>

        <div class="status-stepper">
          ${STATUS_STEPS.map((step, i) => `
            <div class="status-step ${i <= order.stepIndex ? 'is-done' : ''} ${i === order.stepIndex ? 'is-current' : ''}">
              <span class="status-dot"></span>
              <span class="status-label">${step}</span>
            </div>
          `).join('')}
        </div>

        <p class="hint status-eta">${order.eta || 'Мы напишем, когда будет готово'}</p>

        <button class="secondary-button tappable" data-action="open-support">Написать в поддержку</button>
      </div>`;
  },
};

/* ---------------------------------- ЭКРАН: результат ---------------------------------- */

const ResultScreen = {
  render(params) {
    const order = findOrder(params.orderId);
    const s = findService(order.serviceId);
    return `
      <div class="screen-pad">
        <h1 class="screen-title">Готово! 🎉</h1>
        ${beforeAfterBlock(s.emoji, 60)}
        <p class="service-description" style="margin-top:16px">${order.resultPreview || 'Результат по заказу «' + s.title + '» готов и сохранён.'}</p>
        <div class="result-actions">
          <button class="secondary-button tappable" data-action="share-result" data-service="${s.title}">Поделиться</button>
          <button class="secondary-button tappable" data-action="order-again">Заказать ещё</button>
        </div>
      </div>`;
  },
  onEnter() {
    showMainButton('Скачать', () => {
      hapticSuccess();
      showAlert('Файл сохранён (демо-версия без бэкенда)');
    });
  },
  onLeave() { hideMainButton(); },
};

/* ---------------------------------- ЭКРАН: мои заказы ---------------------------------- */

const OrdersScreen = {
  render() {
    const all = [...AppState.orders, ...MOCK_ORDERS];
    if (!all.length) {
      return `
        <div class="screen-pad empty-state">
          <span class="empty-emoji">🗂️</span>
          <h2>Пока нет заказов</h2>
          <p class="hint">Загляните в каталог — там 13 ИИ-услуг</p>
        </div>`;
    }
    return `
      <div class="screen-pad">
        <h1 class="screen-title">Мои заказы</h1>
        <div class="order-list">
          ${all.map((o) => {
            const s = findService(o.serviceId);
            return `
              <button class="order-row tappable" data-action="open-order" data-id="${o.id}">
                ${iconCircle(s.emoji, findCategory(s.categoryId).color)}
                <span class="order-row-body">
                  <span class="order-row-title">${s.title}</span>
                  <span class="order-row-date hint">${o.createdAt}</span>
                </span>
                ${statusBadge(o.stepIndex)}
              </button>`;
          }).join('')}
        </div>
      </div>`;
  },
  onEnter() {
    const all = [...AppState.orders, ...MOCK_ORDERS];
    if (!all.length) {
      showMainButton('Перейти в каталог', () => Router.navigate('catalog'));
    }
  },
  onLeave() { hideMainButton(); },
};

/* ---------------------------------- ЭКРАН: профиль ---------------------------------- */

const ProfileScreen = {
  render() {
    const user = getUser();
    const initial = (user.first_name || 'Г').charAt(0).toUpperCase();
    return `
      <div class="screen-pad">
        <h1 class="screen-title">Профиль</h1>
        <div class="profile-card">
          <span class="profile-avatar">${initial}</span>
          <span class="profile-name">${escapeHtml(user.first_name || 'Гость')} ${escapeHtml(user.last_name || '')}</span>
        </div>
        <div class="profile-menu">
          <button class="profile-menu-item tappable" data-action="go-orders"><span>📦 Мои заказы</span><span class="chevron">›</span></button>
          <button class="profile-menu-item tappable" data-action="share-bot"><span>📤 Поделиться с другом</span><span class="chevron">›</span></button>
          <button class="profile-menu-item tappable" data-action="open-support"><span>💬 Поддержка</span><span class="chevron">›</span></button>
          <button class="profile-menu-item tappable" data-action="open-about"><span>ℹ️ О сервисе</span><span class="chevron">›</span></button>
        </div>
      </div>`;
  },
};

/* ---------------------------------- ЭКРАН: о сервисе ---------------------------------- */

const AboutScreen = {
  render() {
    return `
      <div class="screen-pad">
        <h1 class="screen-title">${BRAND.name}</h1>
        <p class="service-description">${BRAND.tagline}. Мы объединили ИИ-инструменты и ручную доработку, чтобы вы получали готовый результат, а не разбирались в нейросетях сами.</p>
        <p class="hint">Версия MVP · Telegram Mini App</p>
      </div>`;
  },
};

/* ---------------------------------- карта экранов ---------------------------------- */

const SCREEN_HANDLERS = {
  welcome: WelcomeScreen,
  catalog: CatalogScreen,
  category: CategoryScreen,
  service: ServiceScreen,
  brief: BriefScreen,
  payment: PaymentScreen,
  status: StatusScreen,
  result: ResultScreen,
  orders: OrdersScreen,
  profile: ProfileScreen,
  about: AboutScreen,
};
