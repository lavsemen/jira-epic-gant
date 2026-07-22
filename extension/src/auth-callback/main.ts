async function main(): Promise<void> {
  const status = document.getElementById('status');
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');

  if (!token) {
    if (status) {
      status.textContent = 'Токен сессии не получен. Попробуйте войти снова.';
    }
    return;
  }

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'SAVE_SESSION_TOKEN',
      payload: { sessionToken: token },
    });
    if (response?.ok) {
      if (status) {
        status.textContent = 'Вход выполнен. Можно закрыть эту вкладку и вернуться в Jira.';
      }
    } else {
      if (status) {
        status.textContent = response?.error?.message ?? 'Не удалось сохранить сессию.';
      }
    }
  } catch {
    if (status) {
      status.textContent = 'Ошибка сохранения сессии.';
    }
  }
}

void main();
