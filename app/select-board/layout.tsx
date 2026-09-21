import type { Metadata } from "next";

import { DEFAULT_LANGUAGE } from "@/lib/i18n/model";
import { translate } from "@/lib/i18n/translator";

export const metadata: Metadata = {
  title: translate(DEFAULT_LANGUAGE, "selectBoard.layoutTitle"),
};

export default function SelectBoardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
