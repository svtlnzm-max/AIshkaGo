/**
 * telegram.js — тонкая обёртка над Telegram Web App SDK.
 *
 * Задача файла: спрятать все обращения к window.Telegram.WebApp за простыми
 * функциями (tgInit, showMainButton, hapticTap, ...), чтобы остальной код
 * не знал деталей SDK и не падал, если что-то в SDK недоступно.
 *
 * ВАЖНЫЙ НЮАНС (проверено на практике): если открыть страницу НЕ из Telegram,
 * сам telegram-web-app.js всё равно создаёт window.Telegram.WebApp — но как
 * JS-заглушку старой версии (6.0). У этой заглушки методы вроде CloudStorage
 * или setHeaderColor не просто отсутствуют, а бросают исключение
 * "WebAppMethodUnsupported" прямо при вызове. Поэтому КАЖДЫЙ вызов методов
 * tg.* обёрнут в try/catch через safeCall — иначе одна неподдерживаемая
 * функция на старом клиенте уронит всё приложение при старте.
 */

const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;

/** Безопасно вызвать функцию Telegram SDK: при ошибке/отсутствии — просто fallback */
function safeCall(fn, fallback) {
  try {
    return fn();
  } catch (e) {
    return typeof fallback === 'function' ? fallback() : fallback;
  }
}

// true — приложение реально открыто внутри Telegram (есть initData от клиента)
function isTelegramEnv() {
  return !!(tg && tg.initData);
}

/**
 * Инициализация приложения: сообщаем Telegram, что интерфейс готов,
 * разворачиваем на весь экран и применяем цвета темы Telegram.
 */
function tgInit() {
  if (!tg) return;
  safeCall(() => tg.ready());
  safeCall(() => tg.expand());
  safeCall(() => tg.setHeaderColor('secondary_bg_color'));
  applyThemeVars();
  safeCall(() => tg.onEvent('themeChanged', applyThemeVars));
  safeCall(() => tg.onEvent('viewportChanged', () => {
    const h = (tg.viewportStableHeight || window.innerHeight) + 'px';
    document.documentElement.style.setProperty('--tg-viewport-height', h);
  }));
}

/**
 * Переносим цвета темы Telegram (themeParams) в CSS-переменные.
 * Если приложение открыто вне Telegram — переменные не трогаем,
 * работают дефолтные значения из style.css (светлая/тёмная по prefers-color-scheme).
 */
function applyThemeVars() {
  if (!tg || !tg.themeParams) return;
  const p = tg.themeParams;
  const root = document.documentElement.style;
  const map = {
    '--tg-bg': p.bg_color,
    '--tg-secondary-bg': p.secondary_bg_color,
    '--tg-text': p.text_color,
    '--tg-hint': p.hint_color,
    '--tg-link': p.link_color,
    '--tg-button': p.button_color,
    '--tg-button-text': p.button_text_color,
    '--tg-section-bg': p.section_bg_color || p.secondary_bg_color,
  };
  Object.entries(map).forEach(([cssVar, value]) => {
    if (value) root.setProperty(cssVar, value);
  });
  document.documentElement.setAttribute('data-tg-scheme', tg.colorScheme || 'light');
}

/** Имя пользователя Telegram (или заглушка "Гость" для предпросмотра вне Telegram) */
function getUser() {
  const u = tg && tg.initDataUnsafe && tg.initDataUnsafe.user;
  return u || { first_name: 'Гость', photo_url: null };
}

/* ---------- Тактильный отклик (вибро-фидбек на касания) ---------- */
function hapticTap(style = 'light') {
  if (tg && tg.HapticFeedback) safeCall(() => tg.HapticFeedback.impactOccurred(style));
}
function hapticSuccess() {
  if (tg && tg.HapticFeedback) safeCall(() => tg.HapticFeedback.notificationOccurred('success'));
}

/* ---------- Системные диалоги ---------- */
function showConfirm(message, onConfirm) {
  const handled = tg && tg.showConfirm && safeCall(() => {
    tg.showConfirm(message, (ok) => { if (ok) onConfirm(); });
    return true;
  }, false);
  if (!handled && window.confirm(message)) onConfirm();
}
function showAlert(message) {
  const handled = tg && tg.showAlert && safeCall(() => { tg.showAlert(message); return true; }, false);
  if (!handled) window.alert(message);
}

/* ---------- Черновик заявки: CloudStorage с фолбэком на localStorage ---------- */
function saveDraft(key, value) {
  const json = JSON.stringify(value);
  const ok = tg && tg.CloudStorage && safeCall(() => { tg.CloudStorage.setItem(key, json, () => {}); return true; }, false);
  if (!ok) {
    try { localStorage.setItem(key, json); } catch (e) { /* режим приватного окна — молча игнорируем */ }
  }
}
function loadDraft(key, callback) {
  const ok = tg && tg.CloudStorage && safeCall(() => {
    tg.CloudStorage.getItem(key, (err, value) => callback(value ? JSON.parse(value) : null));
    return true;
  }, false);
  if (!ok) {
    try {
      const raw = localStorage.getItem(key);
      callback(raw ? JSON.parse(raw) : null);
    } catch (e) { callback(null); }
  }
}
function clearDraft(key) {
  const ok = tg && tg.CloudStorage && safeCall(() => { tg.CloudStorage.removeItem(key, () => {}); return true; }, false);
  if (!ok) { try { localStorage.removeItem(key); } catch (e) {} }
}

/* ---------- Поделиться результатом ---------- */
function shareResult(text) {
  const handled = tg && tg.switchInlineQuery && safeCall(() => {
    // switchInlineQuery работает только если у бота включён inline-режим
    tg.switchInlineQuery(text, ['users', 'groups']);
    return true;
  }, false);
  if (handled) return;
  if (navigator.share) {
    navigator.share({ text }).catch(() => {});
  } else {
    showAlert('Функция "Поделиться" доступна в Telegram');
  }
}

function openTelegramLink(url) {
  const handled = tg && tg.openTelegramLink && safeCall(() => { tg.openTelegramLink(url); return true; }, false);
  if (!handled) window.open(url, '_blank');
}

/* ==========================================================================
 * MainButton / BackButton.
 * На реальном устройстве в Telegram используем нативный SDK.
 * Если он недоступен или бросает исключение (старый клиент / браузер вне
 * Telegram) — рисуем свои элементы, идентичные по виду и поведению — FALLBACK.
 * ========================================================================== */

let fallbackMainBtn = null;
let fallbackBackBtn = null;

function ensureFallbackNodes() {
  if (!fallbackMainBtn) {
    fallbackMainBtn = document.createElement('button');
    fallbackMainBtn.id = 'fallback-main-button';
    fallbackMainBtn.className = 'fallback-main-button';
    document.body.appendChild(fallbackMainBtn);
  }
  if (!fallbackBackBtn) {
    fallbackBackBtn = document.createElement('button');
    fallbackBackBtn.id = 'fallback-back-button';
    fallbackBackBtn.className = 'fallback-back-button';
    fallbackBackBtn.innerHTML = '‹';
    fallbackBackBtn.setAttribute('aria-label', 'Назад');
    document.body.appendChild(fallbackBackBtn);
  }
}

/**
 * Показать главную кнопку внизу экрана с текстом и обработчиком нажатия.
 *
 * Гейтим по isTelegramEnv(), а не по "есть ли tg.MainButton": вне настоящего
 * Telegram SDK подставляет JS-заглушку, чья MainButton принимает вызовы без
 * ошибок, но физически ничего не рисует (в реальном Telegram эту кнопку
 * рисует нативный хост-контейнер вне WebView). Поэтому вне Telegram всегда
 * используем свой нарисованный fallback — иначе кнопка станет невидимой и
 * нажать её будет невозможно.
 */
function showMainButton(text, onClick) {
  if (isTelegramEnv() && tg.MainButton) {
    const usedNative = safeCall(() => {
      tg.MainButton.offClick(tg.MainButton._lastHandler || (() => {}));
      tg.MainButton.setText(text);
      tg.MainButton.onClick(onClick);
      tg.MainButton._lastHandler = onClick;
      tg.MainButton.show();
      tg.MainButton.enable();
      return true;
    }, false);
    if (usedNative) return;
  }
  // Фолбэк: браузер вне Telegram или старый клиент без поддержки MainButton
  ensureFallbackNodes();
  fallbackMainBtn.textContent = text;
  fallbackMainBtn.onclick = onClick;
  fallbackMainBtn.style.display = 'flex';
  document.body.classList.add('has-fallback-main-button');
}

function hideMainButton() {
  if (isTelegramEnv() && tg.MainButton) safeCall(() => tg.MainButton.hide());
  if (fallbackMainBtn) fallbackMainBtn.style.display = 'none';
  document.body.classList.remove('has-fallback-main-button');
}

function setMainButtonLoading(isLoading) {
  if (isTelegramEnv() && tg.MainButton) {
    safeCall(() => (isLoading ? tg.MainButton.showProgress(false) : tg.MainButton.hideProgress()));
  }
  if (fallbackMainBtn) fallbackMainBtn.classList.toggle('is-loading', isLoading);
}

/** Включить/выключить главную кнопку (например, пока не заполнено обязательное поле) */
function setMainButtonEnabled(enabled) {
  if (isTelegramEnv() && tg.MainButton) {
    safeCall(() => (enabled ? tg.MainButton.enable() : tg.MainButton.disable()));
  }
  if (fallbackMainBtn) {
    fallbackMainBtn.disabled = !enabled;
    fallbackMainBtn.classList.toggle('is-disabled', !enabled);
  }
}

/** Показать/скрыть кнопку "Назад" в шапке (та же логика гейта, что и у MainButton) */
function showBackButton(onClick) {
  if (isTelegramEnv() && tg.BackButton) {
    const usedNative = safeCall(() => {
      tg.BackButton.offClick(tg.BackButton._lastHandler || (() => {}));
      tg.BackButton.onClick(onClick);
      tg.BackButton._lastHandler = onClick;
      tg.BackButton.show();
      return true;
    }, false);
    if (usedNative) return;
  }
  ensureFallbackNodes();
  fallbackBackBtn.onclick = onClick;
  fallbackBackBtn.style.display = 'flex';
  // В реальном Telegram BackButton рисуется вне веб-страницы и не перекрывает контент;
  // у нарисованного фолбэка добавляем отступ сверху, чтобы не наезжал на заголовок экрана
  document.body.classList.add('has-fallback-back-button');
}

function hideBackButton() {
  if (isTelegramEnv() && tg.BackButton) safeCall(() => tg.BackButton.hide());
  if (fallbackBackBtn) fallbackBackBtn.style.display = 'none';
  document.body.classList.remove('has-fallback-back-button');
}

function closeApp() {
  if (tg && tg.close) safeCall(() => tg.close());
}
