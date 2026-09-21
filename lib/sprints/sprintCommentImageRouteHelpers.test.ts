import { describe, expect, it } from 'vitest';

import { parseSprintImageCommentFormData } from './sprintCommentImageRouteHelpers';

function jpegFile(): File {
  return new File([Uint8Array.from([0xff, 0xd8, 0xff, 0x00])], 'photo.jpg', { type: 'image/jpeg' });
}

describe('parseSprintImageCommentFormData', () => {
  it('accepts a jpeg with geometry fields', async () => {
    const formData = new FormData();
    formData.append('file', jpegFile());
    formData.append('assigneeId', 'dev-1');
    formData.append('caption', ' Polaroid ');
    formData.append('day', '1');
    formData.append('part', '0');
    formData.append('width', '2');
    formData.append('height', '1');

    const parsed = await parseSprintImageCommentFormData(formData);
    expect(parsed).toMatchObject({
      ok: true,
      value: {
        assigneeId: 'dev-1',
        caption: 'Polaroid',
        contentType: 'image/jpeg',
        day: 1,
        height: 1,
        part: 0,
        width: 2,
      },
    });
  });

  it('rejects a missing file', async () => {
    const formData = new FormData();
    formData.append('assigneeId', 'dev-1');
    formData.append('day', '0');
    formData.append('part', '0');
    expect(await parseSprintImageCommentFormData(formData)).toEqual({
      error: 'Image file is required',
      ok: false,
      status: 400,
    });
  });
});
