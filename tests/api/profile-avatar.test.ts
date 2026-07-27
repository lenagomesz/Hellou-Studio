// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockGetBucket,
  mockCreateBucket,
  mockUpload,
  mockDownload,
  mockRemove,
  mockUpdate,
  userBuilder,
} = vi.hoisted(() => {
  const builder: Record<string, ReturnType<typeof vi.fn> | ((resolve: (value: unknown) => void) => void)> = {};
  builder.select = vi.fn().mockReturnValue(builder);
  builder.eq = vi.fn().mockReturnValue(builder);
  builder.maybeSingle = vi.fn().mockResolvedValue({ data: { avatar_url: 'uploaded' }, error: null });
  builder.then = (resolve: (value: unknown) => void) => resolve({ data: null, error: null });

  return {
    mockGetBucket: vi.fn(),
    mockCreateBucket: vi.fn(),
    mockUpload: vi.fn(),
    mockDownload: vi.fn(),
    mockRemove: vi.fn(),
    mockUpdate: vi.fn().mockReturnValue(builder),
    userBuilder: builder,
  };
});

vi.mock('@/lib/api', () => ({
  requireUser: vi.fn().mockResolvedValue({
    user: { id: 'user-123', email: 'user@example.com', role: 'user' },
  }),
}));

vi.mock('@/lib/supabase', () => ({
  getSupabaseAdmin: () => ({
    from: () => ({
      ...userBuilder,
      update: mockUpdate,
    }),
    storage: {
      getBucket: mockGetBucket,
      createBucket: mockCreateBucket,
      from: () => ({
        upload: mockUpload,
        download: mockDownload,
        remove: mockRemove,
      }),
    },
  }),
}));

import { DELETE, GET, POST } from '@/app/api/profile/avatar/route';

function uploadRequest(type = 'image/png') {
  const formData = new FormData();
  formData.append('avatar', new File([new Uint8Array([1, 2, 3])], 'avatar.png', { type }));
  return new Request('http://localhost/api/profile/avatar', {
    method: 'POST',
    body: formData,
  });
}

describe('/api/profile/avatar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetBucket.mockResolvedValue({ data: { id: 'profile-images' }, error: null });
    mockUpload.mockResolvedValue({ data: { path: 'avatars/user-123/profile' }, error: null });
    mockDownload.mockResolvedValue({ data: new Blob(['image'], { type: 'image/png' }), error: null });
    mockRemove.mockResolvedValue({ data: null, error: null });
    mockUpdate.mockReturnValue(userBuilder);
    (userBuilder.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { avatar_url: 'uploaded' },
      error: null,
    });
  });

  it('recusa formatos que não são imagem', async () => {
    const response = await POST(uploadRequest('text/plain'));

    expect(response.status).toBe(400);
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('salva a foto privada e marca o perfil como enviado', async () => {
    const response = await POST(uploadRequest());

    expect(response.status).toBe(200);
    expect(mockUpload).toHaveBeenCalledWith(
      'avatars/user-123/profile',
      expect.any(ArrayBuffer),
      expect.objectContaining({ contentType: 'image/png', upsert: true }),
    );
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ avatar_url: 'uploaded' }));
  });

  it('serve somente a foto do usuário autenticado sem cache público', async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(mockDownload).toHaveBeenCalledWith('avatars/user-123/profile');
  });

  it('restaura a inicial e remove a foto enviada', async () => {
    const response = await DELETE();

    expect(response.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ avatar_url: null }));
    expect(mockRemove).toHaveBeenCalledWith(['avatars/user-123/profile']);
  });
});
