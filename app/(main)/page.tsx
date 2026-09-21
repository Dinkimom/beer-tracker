import type { Metadata } from "next";

import MainPageClient from "./MainPageClient";

const TAB_TITLES: Record<string, string> = {
  backlog: "Бэклог",
  board: "Доска",
  burndown: "Диаграмма сгорания",
};

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

function getTitleFromSearchParams(sp: { tab?: string } | null): string {
  const tab =
    sp?.tab === "backlog" || sp?.tab === "board" || sp?.tab === "burndown"
      ? sp.tab
      : "board";
  return `Спринты · ${TAB_TITLES[tab] ?? "Доска"}`;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const sp = await searchParams;
  return {
    title: getTitleFromSearchParams(sp),
  };
}

export default function Page() {
  return <MainPageClient />;
}
