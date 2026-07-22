import type { GanttGrouping, GanttZoom } from '@jira-epic-gantt/shared';

interface Props {
  grouping: GanttGrouping;
  zoom: GanttZoom;
  refreshing: boolean;
  onGroupingChange: (value: GanttGrouping) => void;
  onZoomChange: (value: GanttZoom) => void;
  onRefresh: () => void;
  onToday: () => void;
}

const ZOOM_ORDER: GanttZoom[] = ['compact', 'default', 'large'];

export function GanttToolbar({
  grouping,
  zoom,
  refreshing,
  onGroupingChange,
  onZoomChange,
  onRefresh,
  onToday,
}: Props) {
  const zoomIndex = ZOOM_ORDER.indexOf(zoom);

  return (
    <div className="jeg-toolbar">
      <div className="jeg-toolbar__left">
        <label>
          Группировка:{' '}
          <select
            className="jeg-select"
            value={grouping}
            onChange={(event) => onGroupingChange(event.target.value as GanttGrouping)}
          >
            <option value="none">Без группировки</option>
            <option value="status">По статусу</option>
            <option value="assignee">По исполнителю</option>
            <option value="issueType">По типу задачи</option>
          </select>
        </label>
        <span>Масштаб:</span>
        <button
          type="button"
          className="jeg-btn"
          aria-label="Уменьшить масштаб дней"
          disabled={zoomIndex <= 0}
          onClick={() => onZoomChange(ZOOM_ORDER[Math.max(0, zoomIndex - 1)]!)}
        >
          −
        </button>
        <button type="button" className="jeg-btn" disabled>
          {zoom === 'compact' ? 'Компактно' : zoom === 'large' ? 'Крупно' : 'Стандартно'}
        </button>
        <button
          type="button"
          className="jeg-btn"
          aria-label="Увеличить масштаб дней"
          disabled={zoomIndex >= ZOOM_ORDER.length - 1}
          onClick={() =>
            onZoomChange(ZOOM_ORDER[Math.min(ZOOM_ORDER.length - 1, zoomIndex + 1)]!)
          }
        >
          +
        </button>
      </div>
      <div className="jeg-toolbar__right">
        <button type="button" className="jeg-btn" onClick={onRefresh} disabled={refreshing}>
          {refreshing ? 'Обновление…' : 'Обновить'}
        </button>
        <button type="button" className="jeg-btn" onClick={onToday}>
          Сегодня
        </button>
      </div>
    </div>
  );
}
