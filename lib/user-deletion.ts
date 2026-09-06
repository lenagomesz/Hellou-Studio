export function deletedCustomerPatch(userId: string, sessionVersion: number, deletedAt: string) {
  return {
    email: `deleted.${userId}@deleted.invalid`,
    password_hash: `deleted:${userId}`,
    name: null,
    phone: null,
    cpf: null,
    avatar_url: null,
    is_vip: false,
    deleted_at: deletedAt,
    session_version: sessionVersion + 1,
    updated_at: deletedAt,
  };
}
