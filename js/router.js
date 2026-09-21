/**
 * router.js — навигация между экранами внутри одной страницы (SPA).
 *
 * Экраны не являются отдельными HTML-страницами: мы просто подменяем
 * содержимое #screen-container и добавляем CSS-класс для анимации
 * (слайд вперёд/назад или fade при переключении вкладок).
 *
 * "Корневые" вкладки (catalog / orders / profile) при переходе сбрасывают
 * стек навигации — как в нативных приложениях с нижним таббаром: повторное
 * открытие вкладки всегда ведёт на её начальный экран.
 */

const ROOT_TABS = ['catalog', 'orders', 'profile'];

const Router = {
  stack: [{ screen: 'catalog', params: {} }],
  container: null,
  tabbar: null,

  init(containerEl, tabbarEl) {
    this.container = containerEl;
    this.tabbar = tabbarEl;
    this.render('none');
  },

  current() {
    return this.stack[this.stack.length - 1];
  },

  /** Перейти на экран вперёд (со слайдом) */
  navigate(screen, params = {}) {
    if (ROOT_TABS.includes(screen)) {
      const isSameTab = this.current().screen === screen;
      this.stack = [{ screen, params }];
      this.render(isSameTab ? 'none' : 'fade');
    } else {
      this.stack.push({ screen, params });
      this.render('forward');
    }
  },

  /** Заменить текущий экран без добавления в стек */
  replace(screen, params = {}) {
    this.stack[this.stack.length - 1] = { screen, params };
    this.render('forward');
  },

  /**
   * Полностью заменить стек навигации новой цепочкой экранов.
   * Используется после оплаты: вместо того чтобы оставлять статус заказа
   * поверх глубокого стека "каталог → категория → услуга → бриф" (откуда
   * "Назад" вёл бы обратно в старую форму), сворачиваем стек до
   * "Мои заказы → Статус заказа" — один тап "Назад" ведёт к вкладкам,
   * и заказ уже виден в истории.
   */
  resetStackTo(entries) {
    this.stack = entries;
    this.render('forward');
  },

  /** Вернуться на шаг назад */
  back() {
    if (this.stack.length > 1) {
      this.stack.pop();
      this.render('back');
    }
  },

  render(direction) {
    const prevHandler = this._currentHandler;
    if (prevHandler && prevHandler.onLeave) prevHandler.onLeave();

    const { screen, params } = this.current();
    const handler = SCREEN_HANDLERS[screen];
    if (!handler) {
      console.error('Неизвестный экран:', screen);
      return;
    }
    this._currentHandler = handler;

    const wrap = document.createElement('div');
    wrap.className = 'screen';
    if (direction === 'forward') wrap.classList.add('screen-in-right');
    if (direction === 'back') wrap.classList.add('screen-in-left');
    if (direction === 'fade') wrap.classList.add('screen-in-fade');
    wrap.innerHTML = handler.render(params);

    this.container.innerHTML = '';
    this.container.appendChild(wrap);
    this.container.scrollTop = 0;

    if (handler.onEnter) handler.onEnter(params);

    this.updateChrome();
  },

  /** Обновляем таббар и кнопку "Назад" под текущий экран */
  updateChrome() {
    const canGoBack = this.stack.length > 1;
    const isTabRoot = ROOT_TABS.includes(this.current().screen) && this.stack.length === 1;

    if (canGoBack) {
      showBackButton(() => this.back());
    } else {
      hideBackButton();
    }
    this.tabbar.classList.toggle('is-hidden', !isTabRoot);

    this.tabbar.querySelectorAll('.tab').forEach((el) => {
      el.classList.toggle('is-active', el.dataset.tab === this.current().screen);
    });
  },
};
