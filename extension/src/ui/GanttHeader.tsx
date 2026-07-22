import type { EpicGanttData } from '@epic-plan/shared';
import { ProgressBar } from './ProgressBar';

interface Props {
  data: EpicGanttData | null;
  epicKey: string;
  onClose: () => void;
}

export function GanttHeader({ data, epicKey, onClose }: Props) {
  const summary = data?.epic.summary ?? '';
  const key = data?.epic.key ?? epicKey;

  return (
    <header className="jeg-popover__header">
      <div style={{ minWidth: 0, flex: 1 }}>
        <h2 className="jeg-popover__title">
          <span className="jeg-popover__key">{key}</span>
          <span title={summary}>{summary || 'Диаграмма Ганта'}</span>
        </h2>
        {data ? <ProgressBar tasks={data.tasks} /> : null}
      </div>
      <button
        type="button"
        className="jeg-popover__close"
        aria-label="Закрыть"
        onClick={onClose}
      >
        ×
      </button>
    </header>
  );
}
