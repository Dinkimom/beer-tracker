function decodeXmlEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) =>
      String.fromCharCode(Number.parseInt(hex, 16))
    )
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCharCode(Number(dec)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function stripCdata(text: string): string {
  const trimmed = text.trim();
  if (/^<!\[CDATA\[/i.test(trimmed) && /\]\]>$/.test(trimmed)) {
    return trimmed.replace(/^<!\[CDATA\[/i, '').replace(/\]\]>$/, '').trim();
  }
  return trimmed;
}

/** Извлекает блоки ICS из XML multistatus CalDAV. */
export function extractIcsFromCalDavMultistatus(xml: string): string[] {
  const blocks: string[] = [];
  const re = /<(?:[\w-]+:)?calendar-data[^>]*>([\s\S]*?)<\/(?:[\w-]+:)?calendar-data>/gi;
  let match: RegExpExecArray | null = re.exec(xml);
  while (match) {
    const decoded = stripCdata(decodeXmlEntities(match[1] ?? ''));
    if (decoded.includes('BEGIN:VCALENDAR') || decoded.includes('BEGIN:VEVENT')) {
      blocks.push(decoded);
    }
    match = re.exec(xml);
  }
  return blocks;
}
