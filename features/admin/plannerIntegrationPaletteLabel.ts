import { normalizeStatusKey } from '@/utils/statusColors';

type Translate = (key: string) => string;
type HasTranslation = (key: string) => boolean;

export function plannerStatusPaletteLabel(
  paletteKey: string,
  t: Translate,
  has: HasTranslation
): string {
  const k = normalizeStatusKey(paletteKey.trim());
  if (!k) {
    return '';
  }
  const leaf = `admin.plannerIntegration.palette.${k}`;
  if (has(leaf)) {
    return t(leaf);
  }
  return t('admin.plannerIntegration.paletteDefault');
}
