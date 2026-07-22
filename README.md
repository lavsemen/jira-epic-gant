# Jira Epic Gantt

Внутреннее Chrome-расширение (Manifest V3) для Jira Cloud иконка на карточках эпиков и модальное окно с диаграммой Ганта по прямым дочерним задачам (открывается по клику).

## Состав

- `extension/` — Chrome extension (React + Vite + Shadow DOM)
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
yarn workspace @jira-epic-gantt/shared build
yarn workspace @jira-epic-gantt/server dev
# в другом терминале:
yarn workspace @jira-epic-gantt/extension build
```

### Установка расширения

1. Откройте `chrome://extensions`
2. Включите Developer mode
3. Load unpacked → выберите `extension/dist`
4. Скопируйте Extension ID и пропишите в `.env` как `EXTENSION_ID=`
5. Добавьте backend URL в `host_permissions` манифеста, если это не localhost
6. Пересоберите extension: `yarn workspace @jira-epic-gantt/extension build`
7. Нажмите Reload у расширения

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

Единственная модель:

1. **Start** — дата перевода задачи в In Progress («В работе») по changelog  
   (категория `indeterminate` / выход из To Do; fallback `statuscategorychangedate`)
2. **End** — Start + Original Estimate (`timetracking` / `timeoriginalestimate`)
   - `8 часов = 1 рабочий день`
   - выходные пропускаются
   - даты включительно (1 день → start = end)

Если нет перехода в In Progress или нет Original Estimate — задача в блоке «Требует оценки».

## Отменённые статусы

```env
CANCELLED_STATUS_IDS=10001,10002
```

Если список пуст, используются текстовые алиасы: cancelled/canceled/отменено/…

## Локальный запуск backend

```bash
yarn workspace @jira-epic-gantt/server dev
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

Jira DOM нестабилен. Селекторы собраны в:

`extension/src/content/jira/selectors.ts`

Включите debug:

- `?ganttDebug=1` в URL доски
- или `localStorage.setItem('ganttDebug','1')`

В консоли появятся стратегии детекции карточек/ключей/иконок.

После инспекции реальной доски обновите селекторы в `selectors.ts` и пересоберите extension.

## Политика линии «Сегодня»

- В рабочий день: вертикальная линия внутри столбца текущего дня
- В выходной (выходные скрыты): линия на ведущей границе следующего рабочего дня, tooltip «Сегодня»

## Сборка production

```bash
yarn build
```

Артефакты:

- `extension/dist` — Load unpacked / ZIP для внутреннего распространения
- `server/dist` — `yarn workspace @jira-epic-gantt/server start`

Перед публикацией в Chrome Web Store добавьте production backend в `host_permissions` и ограничьте CORS конкретным `EXTENSION_ID` (уберите широкий `chrome-extension://` allow в `server/src/index.ts`, если нужно ужесточить).

## Безопасность (MVP)

- `ATLASSIAN_CLIENT_SECRET` только на сервере
- refresh token только в SQLite на сервере
- валидация issue key: `^[A-Z][A-Z0-9_]*-\d+$`
- backend работает только с `ALLOWED_JIRA_HOST` / `ALLOWED_JIRA_CLOUD_ID`
- content script не вызывает Jira API напрямую
