/** Запускает async-задачу без блокировки ответа API; ошибки только в лог. */
export function fireAndForgetNotification(task: () => Promise<void>, logLabel: string): void {
  task().catch((error) => {
    console.error(logLabel, error);
  });
}
