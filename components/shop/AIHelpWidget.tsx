'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowUp, ExternalLink, Loader2, MessageCircle, RefreshCcw, ShoppingBag, Sparkles, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Product {
  id: string;
  name: string;
  base_price: number;
  sale_price: number | null;
  image_url: string | null;
}

const STORAGE_KEY = 'hellou-chat-history-v1';
const WHATSAPP_NUMBER = '5547988450461';

const QUICK_OPTIONS = [
  'Quero encontrar um produto',
  'Como funciona o frete?',
  'Quais são as formas de pagamento?',
  'Ver produtos populares',
] as const;

const QUICK_RESPONSES: Partial<Record<(typeof QUICK_OPTIONS)[number], string>> = {
  'Como funciona o frete?':
    'Para produtos físicos, o valor e o prazo aparecem ao informar seu CEP. O prazo total considera a preparação do pedido e a entrega. Arquivos digitais são enviados sem frete. Se quiser, me diga qual produto você está vendo.',
  'Quais são as formas de pagamento?':
    'Você pode pagar com Pix, cartão de crédito, débito ou boleto. No cartão, o parcelamento disponível aparece no checkout. Posso ajudar com mais alguma dúvida sobre a compra?',
  'Ver produtos populares':
    'Separei alguns produtos para você conhecer. Toque em um deles para ver todos os detalhes — e, se me contar para quem é o presente, eu te ajudo a escolher.',
};

const FOLLOW_UP_OPTIONS = ['Me ajude a escolher', 'Tenho outra dúvida', 'Quero falar com uma pessoa'] as const;

function cleanFormatting(content: string) {
  return content.replace(/\*\*/g, '').trim();
}

function isStoredMessage(value: unknown): value is Message {
  if (!value || typeof value !== 'object') return false;
  const message = value as Partial<Message>;
  return (
    (message.role === 'user' || message.role === 'assistant') &&
    typeof message.content === 'string' &&
    message.content.length > 0
  );
}

export function AIHelpWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyReady, setHistoryReady] = useState(false);
  const [showProducts, setShowProducts] = useState(false);
  const [suggestedProducts, setSuggestedProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      const stored = window.sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed)) setMessages(parsed.filter(isStoredMessage).slice(-20));
      }
    } catch {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } finally {
      setHistoryReady(true);
    }
  }, []);

  useEffect(() => {
    if (!historyReady) return;
    if (messages.length === 0) window.sessionStorage.removeItem(STORAGE_KEY);
    else window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-20)));
  }, [historyReady, messages]);

  useEffect(() => {
    if (!isOpen) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [isOpen, loading, messages, showProducts]);

  useEffect(() => {
    if (isOpen && !window.matchMedia('(max-width: 639px)').matches) {
      window.setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !window.matchMedia('(max-width: 639px)').matches) return;
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [isOpen]);

  function openWhatsApp(text?: string) {
    const message = text?.trim() || 'Olá, Hellou Studio! Vim pelo chat do site e gostaria de ajuda.';
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  }

  async function loadSuggestedProducts() {
    setShowProducts(true);
    if (suggestedProducts.length > 0 || productsLoading) return;
    setProductsLoading(true);

    try {
      const response = await fetch('/api/products?limit=3&active=true');
      if (!response.ok) throw new Error('Falha ao carregar produtos');
      const data = (await response.json()) as { products?: Product[] };
      setSuggestedProducts((data.products ?? []).slice(0, 3));
    } catch (error) {
      console.error('[shop-chat] Error loading products:', error);
    } finally {
      setProductsLoading(false);
    }
  }

  function startNewConversation() {
    setMessages([]);
    setInput('');
    setShowProducts(false);
    window.sessionStorage.removeItem(STORAGE_KEY);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  async function sendMessage(rawText: string) {
    const text = rawText.trim();
    if (!text || loading) return;

    const userMessage: Message = { role: 'user', content: text };
    const nextMessages: Message[] = [...messages, userMessage].slice(-19);
    setMessages(nextMessages);
    setInput('');

    if (text === 'Quero falar com uma pessoa') {
      const reply = 'Claro! Nosso atendimento humano continua pelo WhatsApp. Vou abrir a conversa para você.';
      setMessages([...nextMessages, { role: 'assistant', content: reply }]);
      openWhatsApp();
      return;
    }

    const quickReply = QUICK_RESPONSES[text as (typeof QUICK_OPTIONS)[number]];
    if (quickReply) {
      setMessages([...nextMessages, { role: 'assistant', content: quickReply }]);
      if (text === 'Ver produtos populares') await loadSuggestedProducts();
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/shop/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages }),
      });
      const data = (await response.json()) as { message?: string; error?: string };
      if (!response.ok || !data.message) throw new Error(data.error || 'Não foi possível responder');

      setMessages([...nextMessages, { role: 'assistant', content: cleanFormatting(data.message) }]);
    } catch (error) {
      console.error('[shop-chat] Error:', error);
      setMessages([
        ...nextMessages,
        {
          role: 'assistant',
          content: 'Não consegui responder agora. Você pode tentar novamente ou chamar nosso atendimento no WhatsApp.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className={`fixed ${
        isOpen
          ? 'inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-[60] flex justify-end sm:inset-x-auto sm:bottom-5 sm:right-5'
          : 'bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-50 sm:bottom-5 sm:right-5'
      }`}
    >
      {isOpen && (
        <section
          aria-label="Assistente virtual da Hellou Studio"
          role="dialog"
          aria-modal="true"
          className="flex h-[min(600px,calc(100dvh-1.5rem-env(safe-area-inset-bottom)))] w-full max-w-[380px] flex-col overflow-hidden rounded-[24px] border border-pink-100 bg-white shadow-[0_24px_80px_-20px_rgba(107,33,65,0.38)] sm:h-[min(620px,calc(100dvh-2.5rem))] sm:w-[380px] sm:rounded-[26px]"
        >
          <header className="relative shrink-0 overflow-hidden bg-[linear-gradient(135deg,var(--store-accent),var(--store-primary),var(--store-secondary))] px-4 py-3.5 text-white sm:px-5 sm:py-4">
            <div className="absolute -right-8 -top-12 h-32 w-32 rounded-full bg-white/15 blur-2xl" />
            <div className="relative flex items-center gap-2.5 sm:gap-3">
              <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-lg border border-white/50 bg-white/95 shadow-sm sm:h-8 sm:w-8">
                <Image src="/images/avatars/axolotl-01.png" alt="Mascote Hellou" fill sizes="32px" className="object-cover" priority />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-display text-sm font-extrabold sm:text-base">Hellou, posso ajudar?</h2>
                <p className="mt-0.5 truncate text-[11px] font-medium text-white/80 sm:text-xs">Online · assistente da Hellou Studio</p>
              </div>
              {messages.length > 0 && (
                <button type="button" onClick={startNewConversation} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white/80 transition hover:bg-white/15 hover:text-white" aria-label="Iniciar nova conversa" title="Nova conversa">
                  <RefreshCcw className="h-4 w-4" />
                </button>
              )}
              <button type="button" onClick={() => setIsOpen(false)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white/80 transition hover:bg-white/15 hover:text-white" aria-label="Fechar conversa">
                <X className="h-5 w-5" />
              </button>
            </div>
          </header>

          <div className="min-h-0 flex-1 overscroll-contain overflow-y-auto bg-[linear-gradient(180deg,#fff7fa_0%,#fff_46%,#fff9f3_100%)] px-3 py-4 sm:px-4 sm:py-5">
            {messages.length === 0 ? (
              <div className="flex min-h-full flex-col gap-5 sm:justify-between sm:gap-6">
                <div className="rounded-2xl border border-pink-100 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-5">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-pink-50 text-pink-500"><Sparkles className="h-4 w-4" /></div>
                  <p className="font-display text-base font-bold text-slate-900">Oi! Que bom ter você aqui.</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">Posso tirar dúvidas, explicar a compra ou ajudar você a encontrar o produto ideal.</p>
                </div>

                <div>
                  <p className="mb-2.5 px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Por onde começamos?</p>
                  <div className="grid gap-2">
                    {QUICK_OPTIONS.map(option => (
                      <button key={option} type="button" onClick={() => sendMessage(option)} className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-pink-300 hover:text-pink-700 hover:shadow-md">
                        {option}
                        <ArrowUp className="h-4 w-4 rotate-45 text-slate-300 transition group-hover:text-pink-500" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4" aria-live="polite">
                {messages.map((message, index) => (
                  <div key={`${message.role}-${index}`} className={`flex items-end gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {message.role === 'assistant' && (
                      <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-lg border border-pink-100 bg-white"><Image src="/images/avatars/axolotl-02.png" alt="" fill sizes="28px" className="object-cover" /></div>
                    )}
                    <div className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-6 shadow-sm sm:max-w-[82%] sm:px-4 sm:py-3 ${message.role === 'user' ? 'rounded-br-md bg-[linear-gradient(135deg,var(--store-primary),var(--store-accent))] text-white' : 'rounded-bl-md border border-slate-100 bg-white text-slate-700'}`}>
                      {message.content}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex items-end gap-2">
                    <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-lg border border-pink-100 bg-white"><Image src="/images/avatars/axolotl-02.png" alt="" fill sizes="28px" className="object-cover" /></div>
                    <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-slate-100 bg-white px-4 py-3 shadow-sm">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-pink-400 [animation-delay:-0.3s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-pink-400 [animation-delay:-0.15s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-pink-400" />
                      <span className="sr-only">Hellou está digitando</span>
                    </div>
                  </div>
                )}

                {showProducts && (
                  <div className="sm:pl-9">
                    {productsLoading ? (
                      <div className="flex items-center gap-2 rounded-2xl border border-pink-100 bg-white p-4 text-xs font-medium text-slate-500"><Loader2 className="h-4 w-4 animate-spin text-pink-500" /> Buscando produtos...</div>
                    ) : suggestedProducts.length > 0 ? (
                      <div className="flex snap-x gap-2.5 overflow-x-auto pb-2">
                        {suggestedProducts.map(product => (
                          <Link key={product.id} href={`/products/${product.id}`} onClick={() => setIsOpen(false)} className="group w-36 shrink-0 snap-start overflow-hidden rounded-2xl border border-pink-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                            <div className="relative h-24 bg-pink-50">
                              {product.image_url ? <Image src={product.image_url} alt={product.name} fill sizes="144px" className="object-cover transition duration-300 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center text-pink-300"><ShoppingBag className="h-7 w-7" /></div>}
                            </div>
                            <div className="p-3">
                              <p className="truncate text-xs font-bold text-slate-800">{product.name}</p>
                              <p className="mt-1 text-xs font-extrabold text-pink-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(product.sale_price ?? product.base_price))}</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )}

                {!loading && messages.at(-1)?.role === 'assistant' && (
                  <div className="flex flex-wrap gap-2 sm:pl-9">
                    {FOLLOW_UP_OPTIONS.map(option => (
                      <button key={option} type="button" onClick={() => sendMessage(option)} className="rounded-full border border-pink-200 bg-white px-3 py-1.5 text-[11px] font-bold text-pink-700 transition hover:border-pink-400 hover:bg-pink-50">{option}</button>
                    ))}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <footer className="shrink-0 border-t border-slate-100 bg-white px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
            <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1.5 transition focus-within:border-pink-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-pink-50">
              <textarea
                ref={inputRef}
                rows={1}
                maxLength={1500}
                value={input}
                onChange={event => setInput(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void sendMessage(input);
                  }
                }}
                placeholder="Escreva sua pergunta..."
                disabled={loading}
                className="max-h-24 min-h-10 flex-1 resize-none bg-transparent px-2.5 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 disabled:opacity-60"
                aria-label="Sua mensagem"
              />
              <button type="button" onClick={() => sendMessage(input)} disabled={loading || !input.trim()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,var(--store-primary),var(--store-secondary))] text-white shadow-sm transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100" aria-label="Enviar mensagem">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
              </button>
            </div>
            <button type="button" onClick={() => openWhatsApp(input)} className="mx-auto mt-2 flex flex-wrap items-center justify-center gap-1.5 text-center text-[11px] font-semibold text-slate-400 transition hover:text-emerald-600">
              <MessageCircle className="h-3.5 w-3.5" /> Atendimento humano pelo WhatsApp <ExternalLink className="h-3 w-3" />
            </button>
          </footer>
        </section>
      )}

      {!isOpen && (
        <button type="button" onClick={() => setIsOpen(true)} className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--store-primary),var(--store-secondary))] p-[3px] shadow-[0_12px_30px_-7px_rgba(219,39,119,0.65)] ring-2 ring-white transition duration-300 hover:-translate-y-1 hover:scale-105 hover:shadow-[0_17px_38px_-8px_rgba(219,39,119,0.75)] active:translate-y-0 active:scale-95" aria-label="Abrir assistente virtual" aria-expanded="false">
          <span className="relative h-full w-full overflow-hidden rounded-full bg-white">
            <Image src="/images/avatars/axolotl-01.png" alt="" fill sizes="50px" className="object-cover transition duration-300 group-hover:scale-105" />
          </span>
          <span aria-hidden="true" className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-[var(--store-accent)] text-white shadow-sm">
            <MessageCircle className="h-3 w-3" strokeWidth={2.6} />
          </span>
        </button>
      )}
    </div>
  );
}
