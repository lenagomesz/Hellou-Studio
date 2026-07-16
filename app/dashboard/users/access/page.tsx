'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, KeyRound, LockKeyhole, ShieldCheck, UserPlus } from 'lucide-react';
import { UserManagementTabs } from '@/components/admin/UserManagementTabs';

type Member = { id: string; name: string | null; email: string; admin_access_level: 'owner' | 'partner' | null; admin_active: boolean; last_login_at: string | null; created_at: string };

export default function TeamAccessPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => { const response = await fetch('/api/admin/team', { cache: 'no-store' }); const result = await response.json(); if (response.ok) setMembers(result.members ?? []); else setError(result.error); setLoading(false); }, []);
  useEffect(() => { void load(); }, [load]);

  async function createMember(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError(''); setMessage('');
    const response = await fetch('/api/admin/team', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const result = await response.json(); setSaving(false);
    if (!response.ok) return setError(result.error ?? 'Erro ao criar acesso');
    setForm({ name: '', email: '', password: '' }); setMessage(result.welcome_email_sent ? 'Acesso criado e e-mail de boas-vindas enviado.' : 'Acesso criado, mas o e-mail não pôde ser enviado. Confira a configuração do Resend.'); await load();
  }

  async function toggleAccess(member: Member) {
    const response = await fetch('/api/admin/team', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: member.id, active: !member.admin_active }) });
    const result = await response.json();
    if (!response.ok) return setError(result.error ?? 'Erro ao alterar acesso');
    setMembers((current) => current.map((item) => item.id === member.id ? { ...item, admin_active: !item.admin_active } : item));
  }

  return <div className="space-y-6"><UserManagementTabs />
    <header className="rounded-[28px] border border-pink-100 bg-gradient-to-br from-white via-pink-50 to-orange-50 p-6 shadow-sm sm:p-8"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink-600">Administração protegida</p><h1 className="mt-2 text-3xl font-bold text-slate-950">Equipe e acessos</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Crie o acesso operacional da sua sócia e suspenda-o quando precisar, sem apagar histórico ou movimentações.</p></header>
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <form onSubmit={createMember} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-pink-50 text-pink-600"><UserPlus className="h-5 w-5" /></span><div><h2 className="font-bold text-slate-900">Nova sócia operacional</h2><p className="text-xs text-slate-500">Acesso operacional restrito; valores dos pedidos continuam visíveis.</p></div></div><div className="mt-6 space-y-4">{[['name','Nome completo','text'],['email','E-mail de acesso','email'],['password','Senha temporária (mínimo de 10 caracteres)','password']].map(([key,label,type]) => <label key={key} className="block text-xs font-semibold text-slate-600">{label}<input required type={type} value={form[key as keyof typeof form]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100" /></label>)}</div><p className="mt-3 text-[11px] leading-5 text-slate-500">Ela receberá um e-mail de boas-vindas com o link do painel. Compartilhe a senha temporária por outro canal.</p>{error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-xs text-red-700">{error}</p>}{message && <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-700">{message}</p>}<button disabled={saving} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-pink-600 disabled:opacity-50"><KeyRound className="h-4 w-4" />{saving ? 'Criando acesso...' : 'Criar acesso operacional'}</button></form>
      <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"><div className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-pink-600" /><h2 className="font-bold text-slate-900">O que a sócia poderá fazer</h2></div><div className="mt-4 grid gap-2 sm:grid-cols-2">{['Ver o resumo operacional','Consultar pedidos sem alterar o status','Gerenciar encomendas','Cadastrar e editar produtos','Controlar estoque e custos','Consultar clientes','Moderar avaliações'].map((item) => <div key={item} className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-xs font-semibold text-emerald-800"><Check className="h-4 w-4" />{item}</div>)}</div><div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-4"><div className="flex items-center gap-2 text-sm font-bold text-red-800"><LockKeyhole className="h-4 w-4" />Acesso bloqueado</div><p className="mt-1 text-xs leading-5 text-red-700">Alteração do status de pedidos, ativação ou inativação de produtos, financeiro, análises de receita, campanhas, cupons, configurações, exclusão de clientes, exclusão de produtos e gerenciamento de outros administradores.</p></div></section>
    </div>
    <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm"><div className="border-b border-slate-100 px-5 py-4"><h2 className="font-bold text-slate-900">Administradores cadastrados</h2></div>{loading ? <div className="h-40 animate-pulse bg-slate-50" /> : <div className="divide-y divide-slate-100">{members.map((member) => <div key={member.id} className="flex flex-wrap items-center gap-4 p-5"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-600">{(member.name || member.email).charAt(0).toUpperCase()}</span><div className="min-w-0 flex-1"><p className="font-semibold text-slate-900">{member.name || 'Sem nome'}</p><p className="text-xs text-slate-500">{member.email} · {member.admin_access_level === 'partner' ? 'Sócia operacional' : 'Administradora principal'}</p><p className="mt-1 text-[11px] text-slate-400">Último acesso: {member.last_login_at ? new Date(member.last_login_at).toLocaleString('pt-BR') : 'ainda não acessou'}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${member.admin_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{member.admin_active ? 'Ativo' : 'Suspenso'}</span>{member.admin_access_level === 'partner' && <button onClick={() => toggleAccess(member)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:border-pink-300">{member.admin_active ? 'Suspender acesso' : 'Reativar acesso'}</button>}</div>)}</div>}</section>
  </div>;
}
