'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2, MessageCircle } from 'lucide-react';
import Image from 'next/image';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const QUICK_OPTIONS = [
  'Dúvida sobre produto',
  'Frete e entrega',
  'Formas de pagamento',
  'Falar com vendedor',
];

export function AIHelpWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  function getWhatsAppLink(text: string): string {
    const storePhone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '5511999999999';
    const encodedText = encodeURIComponent(text);
    return `https://wa.me/${storePhone}?text=${encodedText}`;
  }

  function sendToWhatsApp(text: string) {
    const link = getWhatsAppLink(text);
    window.open(link, '_blank');
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function sendMessage(text: string) {
    if (!text.trim()) return;

    const newMessages: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setInput('');
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
          content: `Desculpe, ocorreu um erro. Tente conversar via WhatsApp.`,
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
        <div className="w-96 max-h-96 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5">
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
                <div className="text-xs text-white/80">Responde em tempo real</div>
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
                  <p className="text-xs text-gray-600 font-medium">Olá! Como posso ajudar?</p>
                </div>
                <div className="flex flex-col gap-2 w-full">
                  {QUICK_OPTIONS.map((option) => (
                    <button
                      key={option}
                      onClick={() => sendMessage(option)}
                      className="px-3 py-2 bg-white border border-pink-200 rounded-lg text-xs text-gray-700 hover:bg-pink-50 hover:border-pink-400 transition-all text-left"
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
                      <div className="relative h-6 w-6 flex-shrink-0 mt-1">
                        <Image
                          src="/images/avatars/axolotl-02.png"
                          alt="Hellou"
                          fill
                          className="object-contain rounded-full"
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
                      {msg.content}
                      {msg.role === 'assistant' && (
                        <button
                          onClick={() => sendToWhatsApp(msg.content)}
                          className="block mt-2 text-xs text-pink-600 hover:text-pink-700 font-medium"
                        >
                          Enviar pro WhatsApp →
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-pink-100 rounded-lg px-3 py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-pink-500" />
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
                className="w-full text-xs text-pink-600 hover:text-pink-700 font-medium py-1 flex items-center justify-center gap-1"
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
        className="w-14 h-14 rounded-full bg-gradient-to-r from-pink-500 via-pink-400 to-orange-500 text-white shadow-xl hover:shadow-2xl transition-all hover:scale-110 flex items-center justify-center overflow-hidden border-2 border-white"
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <Image
            src="/images/avatars/axolotl-01.png"
            alt="Hellou"
            width={56}
            height={56}
            className="w-full h-full object-cover"
            priority
          />
        )}
      </button>
    </div>
  );
}
