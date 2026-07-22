export function LoadingState() {
  return (
    <div className="jeg-skeleton" aria-busy="true" aria-label="Загрузка диаграммы">
      <div className="jeg-skeleton__line jeg-skeleton__line--lg" />
      <div className="jeg-skeleton__line" />
      <div className="jeg-skeleton__line" />
      <div className="jeg-skeleton__line" style={{ width: '80%' }} />
      <div className="jeg-skeleton__line" style={{ width: '70%' }} />
      <div className="jeg-skeleton__line" style={{ width: '90%' }} />
    </div>
  );
}
