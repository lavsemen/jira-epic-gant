import { Router } from 'express';
import { isValidIssueKey, normalizeIssueKey } from '@epic-plan/shared';
import { config } from '../config.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';
import {
  ensureChangelogs,
  getIssue,
  listFields,
  listStatuses,
  searchIssuesByJql,
} from '../jira/jira-client.js';
import { mapJiraFields } from '../jira/jira-fields.js';
import { mapEpicTasks } from '../jira/jira-mapper.js';
import { AppError } from '../jira/jira-errors.js';

export const jiraRouter = Router();

jiraRouter.get('/fields', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const raw = await listFields(req.sessionRow!);
    res.json(mapJiraFields(raw));
  } catch (error) {
    next(error);
  }
});

jiraRouter.get('/epics/:epicKey/tasks', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const epicKey = normalizeIssueKey(String(req.params.epicKey ?? ''));
    if (!isValidIssueKey(epicKey)) {
      throw new AppError('INVALID_EPIC_KEY', 'Некорректный ключ эпика.', 400);
    }

    const session = req.sessionRow!;
    if (session.jira_host !== config.allowedJiraHost) {
      throw new AppError('FORBIDDEN', 'Сессия привязана к недопустимому Jira-инстансу.', 403);
    }

    const epicIssue = await getIssue(session, epicKey, ['summary', 'issuetype']);

    const fields = [
      'summary',
      'status',
      'assignee',
      'issuetype',
      'timeoriginalestimate',
      'aggregatetimeoriginalestimate',
      'timetracking',
      'statuscategorychangedate',
    ];

    const [issues, statuses] = await Promise.all([
      searchIssuesByJql({
        session,
        jql: `parent = ${epicKey} ORDER BY Rank ASC`,
        fields,
        maxResults: 100,
      }),
      listStatuses(session),
    ]);

    await ensureChangelogs(session, issues, true);

    const data = mapEpicTasks({
      epicKey,
      epicSummary: String(epicIssue.fields.summary ?? epicKey),
      issues,
      statuses,
      cancelledStatusIds: config.cancelledStatusIds,
      jiraHost: config.allowedJiraHost,
    });

    res.json(data);
  } catch (error) {
    next(error);
  }
});
