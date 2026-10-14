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

## Структура

```
src/app/
├── core/
│   ├── auth/             # AuthService (signals): me, can(code), login/logout/refresh
│   ├── interceptors/     # 401 → обновить токен → повторить запрос
│   ├── guards/           # authGuard (всё закрыто без входа), guestGuard (страница входа)
│   ├── directives/       # *appCan="'ship'" — показать, только если есть право
│   └── http-error.ts     # текст ошибки из ответа API
├── layout/shell/         # шапка: логотип, меню, пользователь, «Выйти»
└── pages/                # login, production, …
```

Шрифты (Golos Text, JetBrains Mono) входят в сборку (`@fontsource`), интернет на сервере не нужен.
Цвета — CSS-переменные в `src/styles.css`, палитра из `new-crm/brand`.

## Сервер

Образ собирается в Docker: Node собирает Angular, nginx раздаёт его и проксирует
`/api` и `/admin` в контейнер `app` (Django). Запускается из `millarym-back/docker-compose.yml`
(сервис `frontend`, порт 8000).
