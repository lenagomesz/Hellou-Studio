#!/usr/bin/env node
/**
 * Seed admin user.
 * Usage: node --env-file=.env.local scripts/seed-admin.mjs
 */
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@helloustudio.com.br';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin1234';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

const { data: existing } = await admin
  .from('users')
  .select('id, role')
  .eq('email', ADMIN_EMAIL)
  .maybeSingle();

if (existing) {
  await admin
    .from('users')
    .update({ password_hash: passwordHash, role: 'admin' })
    .eq('id', existing.id);
  console.log(`✓ Admin atualizado: ${ADMIN_EMAIL}`);
} else {
  const { error } = await admin.from('users').insert({
    email: ADMIN_EMAIL,
    password_hash: passwordHash,
    name: 'Admin',
    role: 'admin',
  });
  if (error) {
    console.error('Erro ao criar admin:', error.message);
    process.exit(1);
  }
  console.log(`✓ Admin criado: ${ADMIN_EMAIL}`);
}

console.log(`  Email: ${ADMIN_EMAIL}`);
console.log(`  Senha: ${ADMIN_PASSWORD}`);
console.log(`  Dashboard: /dashboard`);
