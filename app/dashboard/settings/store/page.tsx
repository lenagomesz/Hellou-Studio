'use client';
/* eslint-disable @next/next/no-img-element -- Logos white-label may come from customer-controlled remote domains. */

import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronUp, ExternalLink, ImageIcon, Loader2, Palette, Plus, Save, Search, Share2, ShoppingBag, Store, Trash2, Undo2 } from 'lucide-react';
import { DEFAULT_STORE_SETTINGS, type StoreSettings } from '@/lib/store-settings-schema';

type Section = keyof StoreSettings;

const TABS: Array<{ id: Section; label: string; icon: typeof Store }> = [
  { id: 'identity', label: 'Identidade', icon: Store },
  { id: 'theme', label: 'Aparência', icon: Palette },
  { id: 'contact', label: 'Contato e redes', icon: Share2 },
  { id: 'commerce', label: 'Comercial', icon: ShoppingBag },
  { id: 'seo', label: 'SEO', icon: Search },
  { id: 'home', label: 'Banners da home', icon: ImageIcon },
];

function TextField({
  label,
  value,
  onChange,
  hint,
  type = 'text',
  maxLength,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  hint?: string;
  type?: 'text' | 'email' | 'url' | 'number';
  maxLength?: number;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-950 outline-none transition focus:border-pink-400 focus:ring-2 focus:ring-pink-500/10"
      />
      {hint && <span className="mt-1 block text-[11px] leading-4 text-slate-400">{hint}</span>}
    </label>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-slate-700">{label}</span>
      <span className="mt-1.5 flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2">
        <input type="color" value={value} onChange={(event) => onChange(event.target.value.toUpperCase())} className="h-9 w-12 cursor-pointer rounded-lg border-0 bg-transparent p-0" />
        <input value={value} onChange={(event) => onChange(event.target.value.toUpperCase())} maxLength={7} className="min-w-0 flex-1 bg-transparent px-2 font-mono text-sm uppercase outline-none" />
      </span>
    </label>
  );
}

export default function StoreSettingsPage() {
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS);
  const [savedSettings, setSavedSettings] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS);
  const [activeTab, setActiveTab] = useState<Section>('identity');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [migrationRequired, setMigrationRequired] = useState(false);

  const dirty = useMemo(() => JSON.stringify(settings) !== JSON.stringify(savedSettings), [settings, savedSettings]);

  useEffect(() => {
    fetch('/api/admin/store-settings', { cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Erro ao carregar configurações');
        setSettings(data.settings);
        setSavedSettings(data.settings);
        setMigrationRequired(Boolean(data.migrationRequired));
      })
      .catch((error: Error) => setMessage(error.message))
      .finally(() => setLoading(false));
  }, []);

  function updateSection<S extends Section>(section: S, patch: Partial<StoreSettings[S]>) {
    setSettings((current) => ({
      ...current,
      [section]: { ...current[section], ...patch },
    }));
    setMessage('');
  }

  function updateSlide(index: number, patch: Partial<StoreSettings['home']['heroSlides'][number]>) {
    updateSection('home', {
      heroSlides: settings.home.heroSlides.map((slide, slideIndex) => slideIndex === index ? { ...slide, ...patch } : slide),
    });
  }

  function moveSlide(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= settings.home.heroSlides.length) return;
    const heroSlides = [...settings.home.heroSlides];
    [heroSlides[index], heroSlides[target]] = [heroSlides[target], heroSlides[index]];
    updateSection('home', { heroSlides });
  }

  async function save() {
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/store-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao salvar');
      setSettings(data.settings);
      setSavedSettings(data.settings);
      setMessage('Configurações publicadas com sucesso.');
      setMigrationRequired(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="grid min-h-[60vh] place-items-center"><Loader2 className="h-7 w-7 animate-spin text-pink-600" /></div>;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-pink-600">Configuração white-label</p>
          <h1 className="mt-1 text-2xl font-black text-slate-950">Central da Loja</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">Altere a identidade, os contatos e as regras comerciais sem editar o código do site.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-pink-200 hover:text-pink-600">
            <ExternalLink className="h-4 w-4" /> Ver loja
          </a>
          <button type="button" disabled={!dirty || saving} onClick={() => { setSettings(savedSettings); setMessage(''); }} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 disabled:opacity-40">
            <Undo2 className="h-4 w-4" /> Desfazer
          </button>
          <button type="button" disabled={!dirty || saving || migrationRequired} onClick={() => void save()} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-bold text-white shadow-lg transition hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-40">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Publicando...' : 'Publicar alterações'}
          </button>
        </div>
      </header>

      {migrationRequired && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          A tela está pronta, mas a migração <strong>20260725_store_settings.sql</strong> precisa ser executada no Supabase antes do primeiro salvamento.
        </div>
      )}
      {message && (
        <div className={`flex items-center gap-2 rounded-2xl border p-4 text-sm ${message.includes('sucesso') ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {message.includes('sucesso') && <Check className="h-4 w-4" />}{message}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)_320px]">
        <nav className="h-fit rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold transition ${activeTab === tab.id ? 'bg-pink-50 text-pink-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                <Icon className="h-4 w-4" /> {tab.label}
              </button>
            );
          })}
        </nav>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          {activeTab === 'identity' && (
            <div className="space-y-5">
              <div><h2 className="text-lg font-black">Identidade da marca</h2><p className="text-sm text-slate-500">Nomes, textos e arquivos visuais usados na loja.</p></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="Nome da loja" value={settings.identity.name} onChange={(name) => updateSection('identity', { name })} maxLength={80} />
                <TextField label="Nome curto" value={settings.identity.shortName} onChange={(shortName) => updateSection('identity', { shortName })} hint="Exibido quando não houver uma imagem de logo." maxLength={40} />
              </div>
              <TextField label="Frase da marca" value={settings.identity.tagline} onChange={(tagline) => updateSection('identity', { tagline })} maxLength={180} />
              <label className="block"><span className="text-xs font-bold text-slate-700">Descrição da loja</span><textarea rows={4} value={settings.identity.description} onChange={(event) => updateSection('identity', { description: event.target.value })} className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-500/10" /></label>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="Logo clara (URL)" value={settings.identity.logoUrl} onChange={(logoUrl) => updateSection('identity', { logoUrl })} type="url" hint="Deixe vazio para exibir o nome curto." />
                <TextField label="Logo para fundo escuro (URL)" value={settings.identity.logoDarkUrl} onChange={(logoDarkUrl) => updateSection('identity', { logoDarkUrl })} type="url" />
                <TextField label="Favicon (URL)" value={settings.identity.faviconUrl} onChange={(faviconUrl) => updateSection('identity', { faviconUrl })} />
                <TextField label="Imagem social (URL)" value={settings.identity.socialImageUrl} onChange={(socialImageUrl) => updateSection('identity', { socialImageUrl })} />
              </div>
            </div>
          )}

          {activeTab === 'theme' && (
            <div className="space-y-5">
              <div><h2 className="text-lg font-black">Aparência</h2><p className="text-sm text-slate-500">Cores centrais disponibilizadas como variáveis para toda a loja.</p></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <ColorField label="Cor principal" value={settings.theme.primary} onChange={(primary) => updateSection('theme', { primary })} />
                <ColorField label="Cor secundária" value={settings.theme.secondary} onChange={(secondary) => updateSection('theme', { secondary })} />
                <ColorField label="Cor de destaque" value={settings.theme.accent} onChange={(accent) => updateSection('theme', { accent })} />
                <ColorField label="Fundo claro" value={settings.theme.background} onChange={(background) => updateSection('theme', { background })} />
                <ColorField label="Texto principal" value={settings.theme.foreground} onChange={(foreground) => updateSection('theme', { foreground })} />
                <TextField label="Arredondamento padrão (px)" type="number" value={settings.theme.radius} onChange={(radius) => updateSection('theme', { radius: Number(radius) })} hint="Entre 4 e 32 pixels." />
              </div>
            </div>
          )}

          {activeTab === 'contact' && (
            <div className="space-y-5">
              <div><h2 className="text-lg font-black">Contato e redes</h2><p className="text-sm text-slate-500">Os links serão usados no rodapé e no atendimento.</p></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="E-mail" type="email" value={settings.contact.email} onChange={(email) => updateSection('contact', { email })} />
                <TextField label="Telefone" value={settings.contact.phone} onChange={(phone) => updateSection('contact', { phone })} />
                <TextField label="WhatsApp com DDI" value={settings.contact.whatsapp} onChange={(whatsapp) => updateSection('contact', { whatsapp })} hint="Somente números. Ex.: 5547999999999" />
                <TextField label="Instagram (URL)" type="url" value={settings.contact.instagram} onChange={(instagram) => updateSection('contact', { instagram })} />
                <TextField label="TikTok (URL)" type="url" value={settings.contact.tiktok} onChange={(tiktok) => updateSection('contact', { tiktok })} />
              </div>
              <label className="block"><span className="text-xs font-bold text-slate-700">Mensagem inicial do WhatsApp</span><textarea rows={4} value={settings.contact.whatsappMessage} onChange={(event) => updateSection('contact', { whatsappMessage: event.target.value })} className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-pink-400" /></label>
            </div>
          )}

          {activeTab === 'commerce' && (
            <div className="space-y-5">
              <div><h2 className="text-lg font-black">Configuração comercial</h2><p className="text-sm text-slate-500">Valores padrão para ofertas, moeda e localização.</p></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="Moeda" value={settings.commerce.currency} onChange={(currency) => updateSection('commerce', { currency })} hint="Código ISO, como BRL." maxLength={3} />
                <TextField label="Localidade" value={settings.commerce.locale} onChange={(locale) => updateSection('commerce', { locale })} hint="Ex.: pt-BR" />
                <TextField label="Fuso horário" value={settings.commerce.timezone} onChange={(timezone) => updateSection('commerce', { timezone })} />
                <TextField label="Frete grátis acima de (R$)" type="number" value={settings.commerce.freeShippingThreshold} onChange={(freeShippingThreshold) => updateSection('commerce', { freeShippingThreshold: Number(freeShippingThreshold) })} />
                <TextField label="Desconto de primeira compra (%)" type="number" value={settings.commerce.firstOrderDiscount} onChange={(firstOrderDiscount) => updateSection('commerce', { firstOrderDiscount: Number(firstOrderDiscount) })} />
              </div>
            </div>
          )}

          {activeTab === 'seo' && (
            <div className="space-y-5">
              <div><h2 className="text-lg font-black">SEO e compartilhamento</h2><p className="text-sm text-slate-500">Como a loja é apresentada nos buscadores e redes sociais.</p></div>
              <TextField label="Título principal" value={settings.seo.title} onChange={(title) => updateSection('seo', { title })} maxLength={70} />
              <label className="block"><span className="text-xs font-bold text-slate-700">Descrição para buscadores</span><textarea rows={4} maxLength={180} value={settings.seo.description} onChange={(event) => updateSection('seo', { description: event.target.value })} className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-pink-400" /><span className="mt-1 block text-right text-[11px] text-slate-400">{settings.seo.description.length}/180</span></label>
            </div>
          )}

          {activeTab === 'home' && (
            <div className="space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div><h2 className="text-lg font-black">Banners principais</h2><p className="text-sm text-slate-500">Edite, ordene ou oculte os slides exibidos no início da loja.</p></div>
                <TextField label="Troca automática (segundos)" type="number" value={settings.home.heroAutoplaySeconds} onChange={(heroAutoplaySeconds) => updateSection('home', { heroAutoplaySeconds: Number(heroAutoplaySeconds) })} />
              </div>
              <div className="space-y-4">
                {settings.home.heroSlides.map((slide, index) => (
                  <article key={slide.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="grid h-7 w-7 place-items-center rounded-lg bg-slate-950 text-xs font-black text-white">{index + 1}</span>
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-600"><input type="checkbox" checked={slide.active} onChange={(event) => updateSlide(index, { active: event.target.checked })} className="rounded text-pink-600" /> Banner ativo</label>
                      </div>
                      <div className="flex gap-1">
                        <button type="button" onClick={() => moveSlide(index, -1)} disabled={index === 0} aria-label="Mover banner para cima" className="rounded-lg border border-slate-200 bg-white p-2 disabled:opacity-30"><ChevronUp className="h-4 w-4" /></button>
                        <button type="button" onClick={() => moveSlide(index, 1)} disabled={index === settings.home.heroSlides.length - 1} aria-label="Mover banner para baixo" className="rounded-lg border border-slate-200 bg-white p-2 disabled:opacity-30"><ChevronDown className="h-4 w-4" /></button>
                        <button type="button" onClick={() => updateSection('home', { heroSlides: settings.home.heroSlides.filter((_, slideIndex) => slideIndex !== index) })} disabled={settings.home.heroSlides.length === 1} aria-label="Excluir banner" className="rounded-lg border border-red-100 bg-white p-2 text-red-500 disabled:opacity-30"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <TextField label="Selo superior" value={slide.badge} onChange={(badge) => updateSlide(index, { badge })} />
                      <TextField label="Texto colorido" value={slide.accent} onChange={(accent) => updateSlide(index, { accent })} />
                      <TextField label="Título" value={slide.title} onChange={(title) => updateSlide(index, { title })} />
                      <TextField label="Texto do botão" value={slide.action} onChange={(action) => updateSlide(index, { action })} />
                      <div className="sm:col-span-2"><TextField label="Link do botão" value={slide.href} onChange={(href) => updateSlide(index, { href })} hint="Use um caminho interno, como /products." /></div>
                      <label className="block sm:col-span-2"><span className="text-xs font-bold text-slate-700">Descrição</span><textarea rows={3} value={slide.description} onChange={(event) => updateSlide(index, { description: event.target.value })} className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-pink-400" /></label>
                      {slide.trust.map((trust, trustIndex) => <TextField key={trustIndex} label={`Destaque ${trustIndex + 1}`} value={trust} onChange={(value) => updateSlide(index, { trust: slide.trust.map((item, itemIndex) => itemIndex === trustIndex ? value : item) })} />)}
                    </div>
                  </article>
                ))}
              </div>
              {settings.home.heroSlides.length < 8 && <button type="button" onClick={() => updateSection('home', { heroSlides: [...settings.home.heroSlides, { id: `slide-${Date.now()}`, badge: 'Novo destaque', accent: 'Sua mensagem', title: 'Título do banner', description: 'Descreva aqui a novidade ou campanha da sua loja.', action: 'Ver mais', href: '/products', trust: ['Atendimento próximo', 'Compra segura', 'Feito com cuidado'], active: true }] })} className="inline-flex items-center gap-2 rounded-xl border border-dashed border-pink-300 px-4 py-3 text-sm font-bold text-pink-700 hover:bg-pink-50"><Plus className="h-4 w-4" /> Adicionar banner</button>}
            </div>
          )}
        </section>

        <aside className="h-fit overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4"><p className="text-xs font-black uppercase tracking-wider text-slate-400">Prévia da marca</p></div>
          <div className="p-5">
            <div className="overflow-hidden rounded-2xl border border-slate-100" style={{ backgroundColor: settings.theme.background, color: settings.theme.foreground }}>
              <div className="h-2" style={{ backgroundImage: `linear-gradient(90deg, ${settings.theme.primary}, ${settings.theme.secondary})` }} />
              <div className="p-5">
                {settings.identity.logoUrl ? <img src={settings.identity.logoUrl} alt="" className="h-10 max-w-full object-contain object-left" /> : <p className="text-xl font-black" style={{ color: settings.theme.primary }}>{settings.identity.shortName}</p>}
                <p className="mt-4 text-lg font-black">{settings.identity.name}</p>
                <p className="mt-1 text-xs leading-5 opacity-65">{settings.identity.tagline}</p>
                <span className="mt-5 inline-flex px-4 py-2 text-xs font-bold text-white" style={{ borderRadius: settings.theme.radius, backgroundColor: settings.theme.primary }}>Ver produtos</span>
              </div>
            </div>
            <p className="mt-4 text-xs leading-5 text-slate-400">A prévia representa as configurações centrais. Algumas áreas antigas serão conectadas às novas cores progressivamente.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
