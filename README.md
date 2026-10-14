# millarym-front

Фронтенд CRM фабрики «Миларум»: Angular 20 (standalone, signals) + Tailwind 3.
Бэкенд — соседний репозиторий `../millarym-back`.

## Запуск для разработки

```bash
npm install
npm start            # http://localhost:4200
```

Бэкенд должен работать на `http://localhost:8000` (`python manage.py runserver`).
Запросы `/api`, `/admin`, `/static`, `/media` проксируются туда (`proxy.conf.json`),
поэтому cookie с токенами работают так же, как на сервере, — с того же адреса.
В `.env` бэка для разработки: `COOKIE_SECURE=False`.

Сборка: `npm run build` → `dist/millarym-front/browser`.

## Структура — Feature-Sliced Design

Слои сверху вниз; импортировать можно только из слоёв **ниже**, а из соседнего
слайса — только через его `index.ts` (публичный API).

```
src/
├── app/          # инициализация: app.config, маршруты, providers (guard, interceptor),
│                 # layouts (каркас: шапка + диалоги), styles
├── pages/        # login, production, placeholder, not-found
├── widgets/      # app-header (поиск, «+ Новое изделие»), stage-tabs, items-table,
│                 # item-card (карточка справа), bulk-bar, trash-fab
├── features/     # auth-by-login, logout, item-actions (переходы, отметки, бригада, подтверждения),
│                 # item-form (новое изделие и правка)
├── entities/     # session (SessionStore, *appCan), item (ItemApi, типы, этапы), catalog (справочники, выбор ткани)
└── shared/       # api (errorText, Page, Ref), config (environment), lib (даты по Екатеринбургу), ui (модалка, toast, confirm)
```

Внутри слайса — сегменты `ui/`, `model/`, `api/`, `lib/`.
Алиасы: `@app/*`, `@pages/*`, `@widgets/*`, `@features/*`, `@entities/*`, `@shared/*`.

Состояние экрана «Производство» — в адресе: `?stage=cut&filter=late&model=3&q=7965&item=42`,
поэтому вкладку, фильтр и открытую карточку можно отправить ссылкой.

Примеры:
- права: `inject(SessionStore).can('ship')` или `<button *appCan="'ship'">`;
- новая сущность (изделие) → `entities/item/{api,model,ui}`, действие «Перенести» →
  `features/move-item`, таблица этапа → `widgets/stage-table`, экран → `pages/production`.

Шрифты (Golos Text, JetBrains Mono) входят в сборку (`@fontsource`), интернет на сервере не нужен.
Цвета — CSS-переменные в `src/styles.css`, палитра из `new-crm/brand`.

## Сервер

Образ собирается в Docker: Node собирает Angular, nginx раздаёт его и проксирует
`/api` и `/admin` в контейнер `app` (Django). Запускается из `millarym-back/docker-compose.yml`
(сервис `frontend`, порт 8000).
