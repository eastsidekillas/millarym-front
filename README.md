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
│                 # layouts (каркас с шапкой), styles
├── pages/        # страницы целиком: login, production, placeholder, not-found
├── widgets/      # крупные блоки страниц: app-header
├── features/     # действия пользователя: auth-by-login (форма входа), logout
├── entities/     # бизнес-сущности: session (SessionApi, SessionStore на signals, *appCan)
└── shared/       # без бизнес-логики: api (errorText), config (environment), ui, lib
```

Внутри слайса — сегменты `ui/`, `model/`, `api/`, `lib/`.
Алиасы: `@app/*`, `@pages/*`, `@widgets/*`, `@features/*`, `@entities/*`, `@shared/*`.

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
