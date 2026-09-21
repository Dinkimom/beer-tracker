import { redirect } from 'next/navigation';

/** Старый URL: перенаправляем на вкладку «Интеграция» на странице трекера. */
export default function TrackerIntegrationRedirectPage() {
  redirect('/admin/tracker?tab=integration');
}
