/**
 * Маппинг статусов дев задач в статусы для QA задач
 * Согласно требованиям:
 * 1. backlog -> backlog; readyForDevelopment -> readyForDevelopment; inProgress, inReview -> readyForDevelopment
 * 2. readyForTest -> readyForTest
 * 3. inTesting -> inTesting (жёлтый в UI, отдельно от «готово к тесту»)
 * 4. rc, closed -> closed
 */
export function mapDevStatusToQAStatus(devStatus: string | undefined): string | undefined {
  if (!devStatus) return undefined;

  const normalizedStatus = devStatus.toLowerCase();

  // Маппинг статусов дев задач в статусы для QA задач
  const statusMap: Record<string, string> = {
    // 1. Ранние фазы dev: бэклог и «готово к разработке»; разработка/ревью — тоже «готово к разработке» для фантома QA
    'backlog': 'backlog',
    'readyfordevelopment': 'readyfordevelopment',
    'inprogress': 'readyfordevelopment',
    'inreview': 'readyfordevelopment',
    'in_review': 'readyfordevelopment',
    'review': 'backlog', // ключ review (если отдельно от inReview) — по-прежнему бэклог QA

    // 2. readyForTest -> readyForTest
    'readyfortest': 'readyfortest',
    'readyfortesting': 'readyfortest',

    // 3. inTesting — сохраняем ключ для цвета и колонок (и snake_case из Tracker)
    'intesting': 'intesting',
    'in_testing': 'intesting',

    // 4. rc, closed -> closed
    'rc': 'closed',
    'closed': 'closed',
  };

  // Возвращаем маппинг или нормализованный статус, если не найден
  return statusMap[normalizedStatus] || normalizedStatus;
}

