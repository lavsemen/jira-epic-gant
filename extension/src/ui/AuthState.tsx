interface Props {
  onLogin: () => void;
}

export function AuthState({ onLogin }: Props) {
  return (
    <div className="jeg-state">
      <div>Для просмотра диаграммы войдите через Atlassian.</div>
      <div className="jeg-state__actions">
        <button type="button" className="jeg-btn" onClick={onLogin}>
          Войти
        </button>
      </div>
    </div>
  );
}
