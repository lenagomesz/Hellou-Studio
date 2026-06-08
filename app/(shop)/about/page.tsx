'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';

function seededRandom(seed: number) {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

function Confetti() {
  const particles = useMemo(() => {
    return Array.from({ length: 18 }).map((_, i) => {
      const size = 4 + seededRandom(i * 4) * 6;
      const left = seededRandom(i * 4 + 1) * 100;
      const delay = seededRandom(i * 4 + 2) * 12;
      const duration = 10 + seededRandom(i * 4 + 3) * 8;
      const color = ['#ec4899', '#f97316', '#fb923c', '#f472b6', '#fdba74'][i % 5];
      const shape = i % 3 === 0 ? 'rounded-full' : i % 3 === 1 ? 'rounded-sm rotate-45' : 'rounded-full scale-x-50';
      return { size, left, delay, duration, color, shape };
    });
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      {particles.map((p, i) => (
        <span
          key={i}
          className={`absolute opacity-40 ${p.shape}`}
          style={{
            width: p.size,
            height: p.size,
            left: `${p.left}%`,
            top: `-${p.size + 10}px`,
            backgroundColor: p.color,
            animation: `confetti-fall ${p.duration}s ${p.delay}s linear infinite`,
          }}
        />
      ))}
    </div>
  );
}

function MouseTrail() {
  const [trail, setTrail] = useState<{ x: number; y: number; id: number }[]>([]);

  useEffect(() => {
    function handleMove(e: MouseEvent) {
      const id = Date.now() + e.clientX;
      setTrail(prev => [...prev.slice(-12), { x: e.clientX, y: e.clientY, id }]);
    }
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  useEffect(() => {
    if (trail.length === 0) return;
    const timeout = setTimeout(() => {
      setTrail(prev => prev.slice(1));
    }, 150);
    return () => clearTimeout(timeout);
  }, [trail]);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
      {trail.map((dot, i) => (
        <span
          key={dot.id}
          className="absolute rounded-full bg-gradient-to-r from-pink-400 to-orange-400"
          style={{
            left: dot.x - 3,
            top: dot.y - 3,
            width: 6 + i * 0.5,
            height: 6 + i * 0.5,
            opacity: (i + 1) / trail.length * 0.6,
            transform: `scale(${0.5 + (i / trail.length) * 0.5})`,
          }}
        />
      ))}
    </div>
  );
}

function ParallaxCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState('');

  function handleMouseMove(e: React.MouseEvent) {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTransform(`perspective(800px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg)`);
  }

  function handleMouseLeave() {
    setTransform('');
  }

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`transition-transform duration-200 ${className ?? ''}`}
      style={{ transform }}
    >
      {children}
    </div>
  );
}

function RevealOnScroll({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.2 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export default function AboutPage() {
  const [hearts, setHearts] = useState<{ id: number; x: number; y: number; size: number }[]>([]);
  const [bannerHue, setBannerHue] = useState(0);

  useEffect(() => {
    let frame: number;
    function animate() {
      setBannerHue(prev => (prev + 0.3) % 360);
      frame = requestAnimationFrame(animate);
    }
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  function spawnHeart(e: React.MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();
    const size = 12 + (id % 10);
    setHearts(prev => [...prev.slice(-20), { id, x, y, size }]);
    setTimeout(() => setHearts(prev => prev.filter(h => h.id !== id)), 1200);
  }

  return (
    <div className="relative overflow-hidden">
      <Confetti />
      <MouseTrail />

      {/* Banner animado */}
      <div
        className="relative px-6 py-10 text-center sm:px-10 sm:py-14 overflow-hidden"
        style={{
          background: `linear-gradient(135deg, hsl(${330 + bannerHue * 0.1}, 80%, 55%), hsl(${25 + bannerHue * 0.1}, 90%, 55%))`,
        }}
      >
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-3 left-[12%] text-4xl animate-spin" style={{ animationDuration: '12s' }}>✦</div>
          <div className="absolute top-6 right-[18%] text-3xl animate-spin" style={{ animationDuration: '8s', animationDirection: 'reverse' }}>✧</div>
          <div className="absolute bottom-3 left-[45%] text-2xl animate-spin" style={{ animationDuration: '10s' }}>✦</div>
          <div className="absolute bottom-5 right-[25%] text-xl animate-spin" style={{ animationDuration: '15s' }}>✧</div>
        </div>
        <h2 className="relative text-2xl font-bold text-white sm:text-3xl">
          Sobre a helloustudio
        </h2>
        <p className="relative mt-2 text-sm text-white/90 sm:text-base">
          Onde criatividade vira peça 3D.
        </p>
      </div>

      <div className="relative mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Link href="/" className="relative z-10 text-sm text-gray-500 hover:text-pink-600 transition">
          ← Voltar
        </Link>

        {/* Card principal com parallax e corações */}
        <RevealOnScroll>
          <ParallaxCard className="relative z-10 mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <div onClick={spawnHeart} className="relative cursor-default">
              {hearts.map(h => (
                <span
                  key={h.id}
                  className="absolute pointer-events-none text-pink-400 animate-[heart-float_1.2s_ease-out_forwards]"
                  style={{ left: h.x, top: h.y, fontSize: h.size }}
                >
                  ♥
                </span>
              ))}

              <div className="space-y-5 text-gray-700 leading-relaxed">
                <p className="text-base">
                  Oie! Eu sou a <span className="font-semibold text-gray-900">Helena</span> e essa aqui é a
                  {' '}<span className="font-semibold bg-gradient-to-r from-pink-500 to-orange-400 bg-clip-text text-transparent">helloustudio</span>.
                </p>

                <p>
                  Eu faço peças em impressão 3D, desde chaveiros até bichinhos e coisas de escritório.
                  Tudo feito aqui por mim, uma de cada vez. Também aceito encomendas personalizadas,
                  é só mandar seu arquivo .stl que eu orço rapidinho.
                </p>
              </div>
            </div>
          </ParallaxCard>
        </RevealOnScroll>

        {/* Como funciona - cada card aparece com delay */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { emoji: '🎨', text: 'Você escolhe ou envia o modelo', color: 'from-pink-100 to-pink-50' },
            { emoji: '🖨️', text: 'Imprimo com cuidado e qualidade', color: 'from-orange-100 to-orange-50' },
            { emoji: '📦', text: 'Envio pra qualquer lugar do Brasil', color: 'from-amber-100 to-amber-50' },
          ].map((item, i) => (
            <RevealOnScroll key={i} delay={i * 150}>
              <ParallaxCard className="rounded-2xl border border-gray-100 bg-gradient-to-br p-5 shadow-sm text-center hover:shadow-md transition-shadow">
                <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${item.color} text-2xl shadow-sm transition-transform duration-300 hover:scale-110 hover:rotate-6`}>
                  {item.emoji}
                </div>
                <p className="mt-3 text-sm font-medium text-gray-800">{item.text}</p>
              </ParallaxCard>
            </RevealOnScroll>
          ))}
        </div>

        {/* O que é impressão 3D */}
        <RevealOnScroll delay={100}>
          <div className="mt-10 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4">O que é impressão 3D?</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              É uma tecnologia que cria objetos físicos camada por camada a partir de um modelo digital.
              A impressora derrete um filamento plástico (PLA) e vai desenhando a peça de baixo pra cima,
              como se fosse um glacê de bolo bem preciso. O resultado é uma peça única, sólida e durável.
            </p>
          </div>
        </RevealOnScroll>

        {/* Materiais */}
        <RevealOnScroll delay={150}>
          <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Material que eu uso</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-green-50 border border-green-100 p-4 transition-transform duration-300 hover:scale-[1.02]">
                <p className="text-sm font-semibold text-green-800">PLA (Ácido Polilático)</p>
                <p className="mt-1 text-xs text-green-700">Plástico biodegradável feito de amido de milho. Não é tóxico, não tem cheiro forte e tem um acabamento liso bonito.</p>
              </div>
              <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 transition-transform duration-300 hover:scale-[1.02]">
                <p className="text-sm font-semibold text-blue-800">Acabamento</p>
                <p className="mt-1 text-xs text-blue-700">Cada peça sai com camadas visíveis (faz parte do charme!). Posso lixar e pintar sob encomenda se quiser algo mais liso.</p>
              </div>
            </div>
          </div>
        </RevealOnScroll>

        {/* Curiosidades */}
        <RevealOnScroll delay={200}>
          <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Curiosidades</h2>
            <div className="space-y-3">
              {[
                { icon: '⏱️', text: 'Um chaveiro leva de 30 min a 2 horas pra imprimir' },
                { icon: '🌡️', text: 'O bico da impressora chega a 200°C pra derreter o filamento' },
                { icon: '📐', text: 'A precisão é de 0.2mm por camada, menor que um fio de cabelo' },
                { icon: '🎨', text: 'Tenho filamentos em mais de 15 cores diferentes' },
                { icon: '♻️', text: 'O PLA é biodegradável e vem de fontes renováveis' },
                { icon: '🧵', text: '1kg de filamento rende entre 50 e 100 peças pequenas' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 group cursor-default">
                  <span className="text-lg transition-transform duration-300 group-hover:scale-125 group-hover:rotate-12">{item.icon}</span>
                  <p className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </RevealOnScroll>

        {/* Perguntas frequentes */}
        <RevealOnScroll delay={250}>
          <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Perguntas frequentes</h2>
            <div className="space-y-4">
              {[
                { q: 'Quanto tempo demora pra fazer meu pedido?', a: 'Peças do catálogo saem em 1 a 3 dias úteis. Encomendas personalizadas dependem da complexidade, mas geralmente de 3 a 7 dias.' },
                { q: 'Posso escolher a cor?', a: 'Sim! Cada produto tem opções de cor disponíveis. Pra encomendas, é só me dizer qual cor você prefere.' },
                { q: 'A peça é resistente?', a: 'Sim, PLA é bem resistente pra uso normal. Só não deixa no sol forte por muito tempo porque pode amolecer.' },
                { q: 'O que é um arquivo .stl?', a: 'É o formato padrão de modelos 3D pra impressão. Se você já tem um modelo pronto, é só enviar. Se não tem, me descreve a ideia que eu vejo o que dá pra fazer.' },
                { q: 'Envia pra todo o Brasil?', a: 'Sim! Envio pelos Correios com rastreamento. Frete grátis acima de R$99.' },
              ].map((item, i) => (
                <details key={i} className="group rounded-xl border border-gray-100 overflow-hidden">
                  <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-medium text-gray-800 hover:bg-gray-50 transition">
                    {item.q}
                    <span className="text-gray-400 transition-transform duration-200 group-open:rotate-45 text-lg">+</span>
                  </summary>
                  <p className="px-4 pb-3 text-sm text-gray-600">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </RevealOnScroll>

        {/* CTA final */}
        <RevealOnScroll delay={300}>
          <div className="mt-8 text-center">
            <Link
              href="/request-print"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-orange-400 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-pink-200/30 transition-all hover:shadow-xl hover:scale-105 active:scale-95"
            >
              Fazer uma encomenda personalizada →
            </Link>
            <p className="mt-3 text-xs text-gray-400">clica no card lá em cima pra uma surpresinha ♥</p>
          </div>
        </RevealOnScroll>
      </div>

      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 0.5; }
          100% { transform: translateY(105vh) rotate(540deg); opacity: 0; }
        }
        @keyframes heart-float {
          0% { transform: translateY(0) scale(1) rotate(0deg); opacity: 1; }
          50% { transform: translateY(-30px) scale(1.3) rotate(-10deg); opacity: 0.8; }
          100% { transform: translateY(-70px) scale(0.8) rotate(10deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
