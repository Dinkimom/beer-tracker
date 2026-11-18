import { deflateSync } from 'node:zlib';

import { DEMO_DEV_ERIN } from '@/lib/demo/demoIds';

import { en, expect, openDemoPlanner, test } from '../fixtures';

const quickAdd = en.sprintPlanner.swimlane.quickAddMenu;

/** PNG с градиентом: однотонную картинку сжатие могло бы пропустить без окна обрезки. */
function gradientPng(width: number, height: number): Buffer {
  const rows = Array.from({ length: height }, (_, y) =>
    Buffer.concat([
      Buffer.from([0]),
      Buffer.from(Array.from({ length: width }, (_, x) => [(x * 255) / width, (y * 255) / height, 120]).flat()),
    ])
  );
  const chunk = (type: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(type), data]);
    const size = Buffer.alloc(4);
    size.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([size, body, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 2, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function crc32(bytes: Buffer): number {
  let crc = ~0;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return ~crc >>> 0;
}

const photo = { buffer: gradientPng(400, 300), mimeType: 'image/png', name: 'photo.png' };

/**
 * TC-027: отмена обрезки нового фото оставляет картинку в черновике без обрезки.
 * У Ken (erin) свободен четверг 15.10 — колонка дня 2.
 */
test('TC-027: отмена обрезки оставляет фото в черновике', async ({ page }) => {
  await openDemoPlanner(page);
  await page
    .getByRole('toolbar')
    .getByRole('button', { name: new RegExp(`^${en.sprintPlanner.swimlane.placementToolbar.cards}`) })
    .click();

  const lane = await page.locator(`[data-swimlane="${DEMO_DEV_ERIN}"]`).boundingBox();
  const day = await page.locator('[data-onboarding-day="2"]').boundingBox();
  if (!lane || !day) throw new Error('нет строки Ken или колонки четверга');
  const draft = page.locator('[data-swimlane-image-draft]');
  const cropper = page.getByRole('dialog', { name: quickAdd.cropImageTitle });
  const cropButton = draft.getByRole('button', { name: quickAdd.cropImageAria });
  // Ячейка создаёт черновик по клику, когда наведение уже нарисовало превью места; у превью нет метки в DOM.
  await expect(async () => {
    await page.mouse.move(day.x + 20, lane.y + 30, { steps: 5 });
    await page.mouse.down();
    await page.mouse.up();
    await expect(draft).toBeVisible({ timeout: 1000 });
  }).toPass();
  await expect(cropButton).toHaveCount(0);

  await test.step('«Отмена» в окне обрезки', async () => {
    await draft.locator('input[type=file]').setInputFiles(photo);
    await expect(cropper).toBeVisible();
    await cropper.getByRole('button', { name: en.common.cancel }).click();
    await expect(cropper).toHaveCount(0);
    await expect(cropButton).toBeVisible();
  });

  await test.step('Escape на новом фото', async () => {
    await draft.locator('input[type=file]').setInputFiles({ ...photo, name: 'photo-2.png' });
    await expect(cropper).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(cropper).toHaveCount(0);
    await expect(draft).toBeVisible();
    await expect(cropButton).toBeVisible();
  });
});
