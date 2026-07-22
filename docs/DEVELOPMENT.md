# Разработка Epic Plan

Техническая документация: структура, локальный запуск, сборка, деплой и CI/CD.
Пользовательская инструкция — в корневом [README.md](../README.md).

## Состав

- `extension/` — Chrome extension (Manifest V3, React + Vite + Shadow DOM)
- `server/` — OAuth 2.0 3LO backend + Jira API proxy (Express + SQLite)
- `shared/` — общие типы и валидация

## Требования

- Node.js 20+
- Yarn 1.x
- Chrome
- Atlassian Developer Console OAuth app (3LO)

## Быстрый старт

```bash
cp .env.example .env
# заполните .env (см. ниже)

yarn install
yarn workspace @epic-plan/shared build
yarn workspace @epic-plan/server dev
# в другом терминале:
yarn workspace @epic-plan/extension build
```

### Установка расширения (dev, unpacked)

1. Откройте `chrome://extensions`
2. Включите Developer mode
3. Load unpacked → выберите `extension/dist`
4. Проверьте, что ID = `offbcpdoobeglioileapfcpalodcdmom` (даёт фиксированный `key`
   в `extension/public/manifest.json`); этот же ID должен стоять в серверном
   `EXTENSION_ID`
5. Нажмите Reload у расширения после каждой пересборки

## Настройка Atlassian OAuth

1. Создайте app: https://developer.atlassian.com/console/myapps/
2. Добавьте OAuth 2.0 (3LO)
3. Callback URL: `http://localhost:8787/auth/atlassian/callback` (или ваш `ATLASSIAN_CALLBACK_URL`)
4. Permissions / scopes:
   - `read:jira-work`
   - `offline_access`
5. Скопируйте Client ID и Secret в `.env`:

```env
ATLASSIAN_CLIENT_ID=...
ATLASSIAN_CLIENT_SECRET=...
ATLASSIAN_CALLBACK_URL=http://localhost:8787/auth/atlassian/callback
ALLOWED_JIRA_HOST=
EXTENSION_ID=<id из chrome://extensions>
VITE_BACKEND_URL=http://localhost:8787
```

### Почему этих scopes достаточно

Classic scope `read:jira-work` покрывает:

- enhanced JQL search (`/rest/api/3/search/jql`)
- чтение issue fields
- `GET /rest/api/3/field`

`offline_access` нужен для refresh token.

## Как считаются даты на диаграмме

1. **Start** — дата перевода задачи в In Progress («В работе») по changelog
   (категория `indeterminate` / выход из To Do; fallback `statuscategorychangedate`)
2. **End** — Start + Original Estimate (`timetracking` / `timeoriginalestimate`)
   - `8 часов = 1 рабочий день`
   - выходные пропускаются
   - даты включительно (1 день → start = end)

Если нет перехода в In Progress или нет Original Estimate — задача в блоке «Требует оценки».

### Отменённые статусы

```env
CANCELLED_STATUS_IDS=10001,10002
```

Если список пуст, используются текстовые алиасы: cancelled/canceled/отменено/…

### Политика линии «Сегодня»

- В рабочий день: вертикальная линия внутри столбца текущего дня
- В выходной (выходные скрыты): линия на ведущей границе следующего рабочего дня, tooltip «Сегодня»

## Локальный запуск backend

```bash
yarn workspace @epic-plan/server dev
```

Эндпоинты:

- `GET /auth/atlassian/start`
- `GET /auth/atlassian/callback`
- `POST /auth/logout`
- `GET /api/session`
- `GET /api/jira/epics/:epicKey/tasks`
- `GET /api/jira/fields`

Сессии и OAuth state хранятся в SQLite (`SQLITE_PATH`, по умолчанию `server/data/sessions.sqlite`).

Refresh token Atlassian **не** передаётся в расширение. Расширение хранит только opaque session token в `chrome.storage.session`.

## Debug DOM-интеграции

Jira DOM нестабилен. Селекторы собраны в `extension/src/content/jira/selectors.ts`.

Включите debug:

- `?ganttDebug=1` в URL доски
- или `localStorage.setItem('ganttDebug','1')`

В консоли появятся стратегии детекции карточек/ключей/иконок. После инспекции
реальной доски обновите селекторы в `selectors.ts` и пересоберите extension.

## Сборка production

```bash
yarn build              # shared + server + extension
yarn package:extension  # свежий extension/dist + zip epic-plan-extension.zip (с key)
```

Артефакты:

- `extension/dist` — Load unpacked / ZIP для внутреннего распространения
- `server/dist` — `yarn workspace @epic-plan/server start`

Перед публикацией в Chrome Web Store добавьте production backend в `host_permissions`
и ограничьте CORS конкретным `EXTENSION_ID`.

## CI/CD (GitHub Actions)

Три workflow в `.github/workflows/`:

### `deploy-server.yml` — авто-деплой backend

Триггер: push в `main` (пути `server/**`, `shared/**`, `yarn.lock`, `package.json`).
По SSH на VPS: `git fetch origin main` → `git reset --hard origin/main` → сборка
`shared` + `server` → `pm2 restart epic-plan`. `reset --hard` делает деплой
устойчивым к force-push (untracked-файлы `.env`, `server/data/`, `dist/`,
`node_modules/` не затрагиваются).

Секреты репозитория (**Settings → Secrets and variables → Actions**):

| Секрет | Значение |
|--------|----------|
| `SSH_HOST` | `109.73.197.42` (или домен) |
| `SSH_USER` | `root` (или отдельный deploy-пользователь) |
| `SSH_KEY` | приватный SSH-ключ (весь PEM) |
| `SSH_PORT` | `22` (опционально) |

Подготовка ключа для деплоя (локально):

```bash
ssh-keygen -t ed25519 -f deploy_key -N "" -C "gh-actions-deploy"
# публичный ключ — на сервер:
ssh-copy-id -i deploy_key.pub root@109.73.197.42
# приватный ключ (содержимое deploy_key) → секрет SSH_KEY
```

Путь на сервере зафиксирован как `/var/www/epic-plan`. На сервере должны быть
установлены Node 20+, Yarn, pm2, лежать боевой `.env` и запущен процесс pm2 с
именем `epic-plan`.

### `build-extension.yml` — сборка zip расширения

Триггер: push в `main` (пути `extension/**`, `shared/**`, `package.json`,
`yarn.lock`) или ручной запуск. Собирает `yarn package:extension` и:

- заливает `epic-plan-extension.zip` как **artifact** прогона (хранение ~90 дней);
- публикует его в **rolling-релиз** с фиксированным тегом `internal-latest`
  (prerelease) — постоянная ссылка для команды:
  `https://github.com/lavsemen/epic-plan/releases/download/internal-latest/epic-plan-extension.zip`

Этот zip идёт **с `key`** → фиксированный ID, совпадающий с серверным `EXTENSION_ID`.

### `publish-extension.yml` — публикация в Chrome Web Store (Unlisted)

Триггер: тег `v*` (или ручной запуск). Собирает `extension/dist`, ставит версию
`0.1.<номер запуска>`, **удаляет** `key` (в сторе ID присваивает магазин), пакует
и публикует через CWS API. Видимость **Unlisted** выставляется один раз в дашборде.

Секреты репозитория:

| Секрет | Значение |
|--------|----------|
| `CWS_EXTENSION_ID` | ID item'а из Chrome Web Store |
| `CWS_CLIENT_ID` | Google OAuth client id |
| `CWS_CLIENT_SECRET` | Google OAuth client secret |
| `CWS_REFRESH_TOKEN` | refresh token для CWS API |

#### Разовая настройка стора

1. Зарегистрируйте аккаунт разработчика: <https://chrome.google.com/webstore/devconsole> (единоразовый сбор $5).
2. Соберите zip и создайте item вручную (первый раз):
   ```bash
   yarn workspace @epic-plan/shared build
   yarn workspace @epic-plan/extension build
   node -e "const fs=require('fs');const p='extension/dist/manifest.json';const m=JSON.parse(fs.readFileSync(p));delete m.key;fs.writeFileSync(p,JSON.stringify(m,null,2))"
   (cd extension/dist && zip -r ../../epic-plan-extension.zip .)
   ```
   Загрузите zip в дашборде, задайте **Visibility → Unlisted**, отправьте на ревью.
3. Скопируйте **Item ID** → секрет `CWS_EXTENSION_ID`.

#### Разовая настройка CWS API (для автопубликации)

1. <https://console.cloud.google.com> → создайте проект → включите **Chrome Web Store API**.
2. **OAuth consent screen**: тип External, добавьте себя в Test users.
3. **Credentials → Create OAuth client ID → Desktop app** → получите `client_id` и `client_secret`.
4. Получите `refresh_token` (одноразово), например через
   [`chrome-webstore-upload-keys`](https://github.com/fregante/chrome-webstore-upload-keys):
   ```bash
   npx chrome-webstore-upload-keys
   ```
5. Занесите `client_id`, `client_secret`, `refresh_token` в секреты `CWS_*`.

#### Выпуск новой версии в стор

```bash
git tag v0.1.0 && git push origin v0.1.0
```

> Store ID ≠ локальный unpacked ID. `externally_connectable` в манифесте задан по
> домену (`https://epicplan.ru/*`), поэтому от ID не зависит.
> Приватный ключ `extension/key.pem` — вне git (`.gitignore`), не теряйте его.

## Безопасность (MVP)

- `ATLASSIAN_CLIENT_SECRET` только на сервере
- refresh token только в SQLite на сервере
- валидация issue key: `^[A-Z][A-Z0-9_]*-\d+$`
- backend работает только с `ALLOWED_JIRA_HOST` / `ALLOWED_JIRA_CLOUD_ID`
- content script не вызывает Jira API напрямую
