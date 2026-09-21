'use client';

export function MainPageClientRedirectingView({ t }: { t: (key: string) => string }) {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-lg text-gray-600">{t('common.redirecting')}</div>
    </div>
  );
}
