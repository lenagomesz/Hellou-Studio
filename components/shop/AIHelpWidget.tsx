'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2, MessageCircle, ShoppingBag } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  productId?: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  base_price: number;
  sale_price: number | null;
  image_url: string | null;
  category: string;
}

const QUICK_RESPONSES: Record<string, string> = {
  'Dúvida sobre produto': 'Qual tipo de produto te interessa? Temos:\n• 🖼️ Produtos artesanais 3D\n• 📥 Arquivos STL digitais\n• 🎁 Chaveiros e acessórios\n\nEscolhe uma categoria! 🎨',
  'Frete e entrega': '📦 **Produtos Físicos:** Frete varia por CEP. Prazo = tempo de produção + envio dos Correios.\n\n**Arquivos Digitais:** Envio por email, sem frete!\n\nQuer simular frete? Entre em contato pelo WhatsApp (47) 98845-0461! 🚚',
  'Formas de pagamento': '💳 Aceitamos:\n• Pix (à vista) - 0% taxa\n• Crédito (à vista ou até 12x)\n• Débito\n• Boleto\n\nTodas as formas seguras e com proteção ao comprador!',
  'Falar com vendedor': '📲 Quer falar com nosso time?\n\n**WhatsApp:** (47) 98845-0461\n**Instagram:** @helloustudio_\n**Email:** contato@helloustudio.com\n\nEstamos prontos para te atender! 😊',
  'Ver produtos populares': 'Carregando os produtos mais procurados... 🛍️',
};

export function AIHelpWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestedProducts, setSuggestedProducts] = useState<Product[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  function getWhatsAppLink(text: string): string {
    const storePhone = '5547988450461';
    const encodedText = encodeURIComponent(text);
    return `https://wa.me/${storePhone}?text=${encodedText}`;
  }

  function sendToWhatsApp(text: string) {
    const link = getWhatsAppLink(text);
    window.open(link, '_blank');
  }

  function isQuickOption(text: string): boolean {
    return text in QUICK_RESPONSES;
  }

  async function loadSuggestedProducts() {
    try {
      const response = await fetch('/api/products?limit=3&active=true');
      const data = await response.json();
      setSuggestedProducts((data.products || []).slice(0, 3));
    } catch (error) {
      console.error('Error loading products:', error);
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    loadSuggestedProducts();
  }, []);

  async function sendMessage(text: string) {
    if (!text.trim()) return;

    const newMessages: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setInput('');

    if (isQuickOption(text)) {
      const autoReply = QUICK_RESPONSES[text];
      setMessages([...newMessages, { role: 'assistant', content: autoReply }]);
      if (text === 'Ver produtos populares') {
        await loadSuggestedProducts();
      }
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/shop/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao gerar resposta');
      }

      setMessages([...newMessages, { role: 'assistant', content: data.message }]);
    } catch (error) {
      console.error('Error:', error);
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: `Desculpe, ocorreu um erro. Tente conversar via WhatsApp (47) 98845-0461.`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Chat Window */}
      {isOpen && (
        <div className="w-96 max-h-[600px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="bg-gradient-to-r from-pink-500 via-pink-400 to-orange-500 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative h-6 w-6 rounded-full overflow-hidden bg-white">
                <Image
                  src="/images/avatars/axolotl-01.png"
                  alt="Hellou"
                  fill
                  className="object-cover"
                  priority
                />
              </div>
              <div>
                <div className="font-semibold text-white text-sm">Hellou</div>
                <div className="text-xs text-white/80">Respostas em tempo real</div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-white/20 p-1 rounded"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gradient-to-b from-orange-50 to-pink-50">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center gap-4">
                <div>
                  <div className="relative h-12 w-12 mx-auto mb-2">
                    <Image
                      src="/images/avatars/axolotl-01.png"
                      alt="Hellou"
                      fill
                      className="object-contain"
                    />
                  </div>
                  <p className="text-xs text-gray-600 font-medium mb-1">Oi! 👋 Bem-vindo à Hellou Studio</p>
                  <p className="text-[11px] text-gray-500">Como posso ajudar você?</p>
                </div>
                <div className="flex flex-col gap-2 w-full">
                  {Object.keys(QUICK_RESPONSES).map((option: string) => (
                    <button
                      key={option}
                      onClick={() => sendMessage(option)}
                      className="px-3 py-2.5 bg-white border border-pink-200 rounded-lg text-xs text-gray-700 hover:bg-pink-50 hover:border-pink-400 transition-all text-left font-medium"
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>
                    {msg.role === 'assistant' && (
                      <div className="relative h-8 w-8 flex-shrink-0 mt-1">
                        <Image
                          src="/images/avatars/axolotl-02.png"
                          alt="Hellou"
                          fill
                          className="object-cover rounded-full"
                        />
                      </div>
                    )}
                    <div
                      className={`max-w-xs rounded-lg px-3 py-2 text-sm ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-r from-pink-500 to-orange-500 text-white'
                          : 'bg-white text-gray-900 border border-pink-100'
                      }`}
                    >
                      <div className="whitespace-pre-wrap break-words">
                        {msg.content.split('\n').map((line, i) => (
                          <div key={i}>{line}</div>
                        ))}
                      </div>
                      {msg.role === 'assistant' && (
                        <button
                          onClick={() => sendToWhatsApp(msg.content)}
                          className="block mt-2 text-xs text-pink-600 hover:text-pink-700 font-medium transition"
                        >
                          📱 Enviar pro WhatsApp →
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Produtos Sugeridos */}
                {suggestedProducts.length > 0 && messages.length > 0 && messages[messages.length - 1].role === 'assistant' && (
                  <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
                    {suggestedProducts.map((product) => (
                      <Link
                        key={product.id}
                        href={`/products/${product.id}`}
                        className="flex-shrink-0 w-32 bg-white border border-pink-200 rounded-lg overflow-hidden hover:shadow-md transition group"
                      >
                        <div className="relative h-24 w-full bg-gray-100">
                          {product.image_url ? (
                            <Image
                              src={product.image_url}
                              alt={product.name}
                              fill
                              className="object-cover group-hover:scale-105 transition"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full text-gray-300">
                              <ShoppingBag className="h-8 w-8" />
                            </div>
                          )}
                        </div>
                        <div className="p-2">
                          <p className="text-xs font-medium text-gray-800 truncate">{product.name}</p>
                          <p className="text-xs font-bold text-pink-600 mt-1">
                            R$ {(product.sale_price ?? product.base_price).toFixed(2)}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-pink-100 rounded-lg px-3 py-2 flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-pink-500" />
                      <span className="text-xs text-gray-600">Digitando...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-pink-200 bg-white px-3 py-3 space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage(input)}
                placeholder="Sua pergunta..."
                className="flex-1 rounded-lg border border-pink-300 px-3 py-2 text-sm focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 focus:outline-none"
                disabled={loading}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={loading || !input.trim()}
                className="rounded-lg bg-gradient-to-r from-pink-500 to-orange-500 px-3 py-2 text-white hover:shadow-lg disabled:opacity-50 transition-all"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
            {input.trim() && (
              <button
                onClick={() => sendToWhatsApp(input)}
                className="w-full text-xs text-pink-600 hover:text-pink-700 font-medium py-1 flex items-center justify-center gap-1 transition"
              >
                <MessageCircle className="h-3 w-3" />
                Enviar direto pro WhatsApp
              </button>
            )}
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full bg-gradient-to-r from-pink-500 via-pink-400 to-orange-500 text-white shadow-xl hover:shadow-2xl transition-all hover:scale-110 flex items-center justify-center overflow-hidden border-2 border-white group"
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <>
            <Image
              src="/images/avatars/axolotl-01.png"
              alt="Hellou"
              width={56}
              height={56}
              className="w-full h-full object-cover"
              priority
            />
            <div className="absolute -top-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-white opacity-0 group-hover:opacity-100 transition" />
          </>
        )}
      </button>
    </div>
  );
}
