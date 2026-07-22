import type { ReactNode } from 'react';
import { GANTT_LAYOUT } from '@epic-plan/shared';
import { usePointerResize } from './usePointerResize';

interface Props {
  taskColWidthPx: number;
  rowHeightPx: number;
  onTaskColWidthChange: (value: number) => void;
  onRowHeightChange: (value: number) => void;
  children?: ReactNode;
}

export function GanttColumnHeader({
  taskColWidthPx,
  rowHeightPx,
  onTaskColWidthChange,
  onRowHeightChange,
  children,
}: Props) {
  const colResize = usePointerResize({
    axis: 'x',
    value: taskColWidthPx,
    min: GANTT_LAYOUT.taskColWidthMin,
    max: GANTT_LAYOUT.taskColWidthMax,
    onChange: onTaskColWidthChange,
  });
  const rowResize = usePointerResize({
    axis: 'y',
    value: rowHeightPx,
    min: GANTT_LAYOUT.rowHeightMin,
    max: GANTT_LAYOUT.rowHeightMax,
    onChange: onRowHeightChange,
  });

  return (
    <div className="jeg-timeline__header">
      <div className="jeg-col-task">
        Задача
        <div
          className="jeg-resize-col"
          role="separator"
          aria-orientation="vertical"
          aria-label="Изменить ширину колонки задач"
          title="Потяните, чтобы изменить ширину колонки"
          onPointerDown={colResize.onPointerDown}
          onPointerMove={colResize.onPointerMove}
          onPointerUp={colResize.onPointerUp}
          onPointerCancel={colResize.onPointerUp}
        />
      </div>
      <div className="jeg-col-days">
        {children}
        <div
          className="jeg-resize-row"
          role="separator"
          aria-orientation="horizontal"
          aria-label="Изменить высоту строк"
          title="Потяните вверх или вниз, чтобы изменить высоту строк"
          onPointerDown={rowResize.onPointerDown}
          onPointerMove={rowResize.onPointerMove}
          onPointerUp={rowResize.onPointerUp}
          onPointerCancel={rowResize.onPointerUp}
        />
      </div>
    </div>
  );
}
