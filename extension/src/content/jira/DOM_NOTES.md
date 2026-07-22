# Jira DOM integration notes

Нестабильные селекторы живут только в `selectors.ts`.

## Как подобрать селекторы на ytme.atlassian.net

1. Откройте доску с карточками эпиков.
2. Включите debug: `localStorage.setItem('ganttDebug','1')` и обновите страницу.
3. В DevTools найдите карточку Epic:
   - ссылку `/browse/PROJECT-123`
   - `data-issue-key` / другие `data-*`
   - иконку типа задачи (alt/src содержит `Epic`)
4. Обновите массивы в `selectors.ts`:
   - `boardRoots`
   - `issueCardCandidates`
   - `iconMountCandidates`
   - `epicIndicators`
5. Пересоберите: `yarn workspace @epic-plan/extension build`
6. Reload unpacked extension.

## Стратегии ключа

1. browse-link
2. data-attr
3. text-fallback

## Стратегии Epic

1. DOM hints (иконка/aria/lozenge)
2. cache известных epic keys после успешного API-ответа
3. unknown → иконка не добавляется (безопасный MVP default)
