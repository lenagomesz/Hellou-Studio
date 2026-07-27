export const PROFILE_AVATARS = [
  '/images/avatars/axolotl-01.png',
  '/images/avatars/axolotl-02.png',
  '/images/avatars/axolotl-03.png',
  '/images/avatars/axolotl-04.png',
  '/images/avatars/axolotl-05.png',
  '/images/avatars/axolotl-06.png',
] as const;

export const PROFILE_AVATAR_BUCKET = 'profile-images';

export function isProfileAvatar(value: unknown): value is (typeof PROFILE_AVATARS)[number] {
  return typeof value === 'string' && PROFILE_AVATARS.includes(value as (typeof PROFILE_AVATARS)[number]);
}

export function profileAvatarImageUrl(avatarUrl: string | null | undefined) {
  return avatarUrl === 'uploaded' ? '/api/profile/avatar' : avatarUrl ?? null;
}
