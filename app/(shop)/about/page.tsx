'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';

function seededRandom(seed: number) {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

function Confetti() {
  const particles = useMemo(() => {
    return Array.from({ length: 28 }).map((_, i) => {
      const size = 6 + seededRandom(i * 4) * 10;
      const left = seededRandom(i * 4 + 1) * 100;
      const delay = seededRandom(i * 4 + 2) * 8;
      const duration = 6 + seededRandom(i * 4 + 3) * 6;
      const color = i % 3 === 0 ? '#ec4899' : i % 3 === 1 ? '#f97316' : '#fb923c';
      const shape = i % 4 === 0 ? 'rounded-full' : i % 4 === 1 ? 'rounded-sm rotate-45' : i % 4 === 2 ? 'rounded-md' : 'rounded-full scale-x-50';
      return { size, left, delay, duration, color, shape };
    });
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      {particles.map((p, i) => (
        <span
          key={i}
          className={`absolute opacity-60 ${p.shape}`}
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
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 0.7; }
          10% { opacity: 0.7; }
          90% { opacity: 0.4; }
          100% { transform: translateY(105vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function CatchGame() {
  const [score, setScore] = useState(0);
  const [ballPos, setBallPos] = useState({ x: 50, y: 50 });
  const [playing, setPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);

  const moveBall = useCallback(() => {
    setBallPos({
      x: Math.random() * 80 + 10,
      y: Math.random() * 80 + 10,
    });
  }, []);

  useEffect(() => {
    if (!playing) return;
    if (timeLeft <= 0) return;
    const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [playing, timeLeft]);

  useEffect(() => {
    if (playing && timeLeft <= 0) {
      const stop = setTimeout(() => setPlaying(false), 0);
      return () => clearTimeout(stop);
    }
  }, [playing, timeLeft]);

  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(moveBall, 1200);
    return () => clearInterval(interval);
  }, [playing, moveBall]);

  function handleCatch() {
    setScore((s) => s + 1);
    moveBall();
  }

  function startGame() {
    setScore(0);
    setTimeLeft(15);
    setPlaying(true);
    moveBall();
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-center text-sm font-semibold text-gray-900 mb-3">
        Mini Game: Pegue o cubo!
      </h3>

      {!playing && timeLeft === 15 && (
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-3">Clique nos cubinhos 3D o mais rápido que puder!</p>
          <button
            type="button"
            onClick={startGame}
            className="rounded-lg bg-gradient-to-r from-pink-500 to-orange-400 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
          >
            Jogar
          </button>
        </div>
      )}

      {!playing && timeLeft <= 0 && (
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-pink-100 to-orange-100">
            <span className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-orange-400 bg-clip-text text-transparent">{score}</span>
          </div>
          <p className="text-sm text-gray-700 font-medium">
            {score >= 10 ? 'Incrível! Você é rápido!' : score >= 5 ? 'Muito bom!' : 'Tente de novo!'}
          </p>
          <button
            type="button"
            onClick={startGame}
            className="mt-3 rounded-lg bg-gradient-to-r from-pink-500 to-orange-400 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
          >
            Jogar novamente
          </button>
        </div>
      )}

      {playing && (
        <>
          <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
            <span>Pontos: <span className="font-bold text-pink-600">{score}</span></span>
            <span>Tempo: <span className="font-bold text-orange-500">{timeLeft}s</span></span>
          </div>
          <div className="relative h-56 w-full overflow-hidden rounded-xl border-2 border-dashed border-pink-200 bg-gradient-to-br from-pink-50/50 to-orange-50/50">
            <button
              type="button"
              onClick={handleCatch}
              className="absolute transition-all duration-200 ease-out"
              style={{ left: `${ballPos.x}%`, top: `${ballPos.y}%`, transform: 'translate(-50%, -50%)' }}
            >
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-pink-500 to-orange-400 shadow-lg shadow-pink-200/50 transition hover:scale-110 rotate-12" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function AboutPage() {
  return (
    <div className="relative">
      {/* Full-width Banner */}
      <div className="bg-gradient-to-r from-pink-500 to-orange-400 px-6 py-10 text-center sm:px-10 sm:py-14">
        <h2 className="text-2xl font-bold text-white sm:text-3xl">
          Conheça a helloustudio
        </h2>
        <p className="mt-2 text-sm text-white/90 sm:text-base">
          Tecnologia, criatividade e impressão 3D feitas com amor.
        </p>
      </div>

      <div className="relative mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Confetti />

      <div className="relative z-10">
        <Link href="/" className="text-sm text-gray-500 hover:text-pink-600 transition">
          ← Voltar
        </Link>

        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="space-y-5 text-gray-700 leading-relaxed">
            <p className="text-base">
              Oi! Eu sou a <span className="font-semibold text-gray-900">Helena</span>, programadora e criadora da
              {' '}<span className="font-semibold bg-gradient-to-r from-pink-500 to-orange-400 bg-clip-text text-transparent">helloustudio</span>.
            </p>

            <p>
              Sempre sonhei em ter uma impressora 3D. Quando finalmente realizei esse sonho,
              decidi juntar minhas duas paixões: programação e criação 3D. Foi assim que nasceu
              a helloustudio, um espaço onde transformo ideias em peças físicas usando tecnologia.
            </p>

            <p>
              Aproveitei meus dons como desenvolvedora para criar este site do zero, com carinho
              e atenção a cada detalhe. Aqui você encontra peças únicas impressas em 3D, desde
              chaveiros criativos até itens de escritório e criaturas fantásticas.
            </p>

            <p>
              Além de vender produtos prontos, aceito encomendas personalizadas! Se você tem um
              arquivo .stl ou uma ideia, manda pra mim que eu faço um orçamento.
            </p>

            <div className="rounded-xl bg-gradient-to-r from-pink-50 to-orange-50 border border-pink-100 p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-2">O que me move</h2>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-gradient-to-r from-pink-500 to-orange-400" />
                  Transformar código em experiências bonitas
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-gradient-to-r from-pink-500 to-orange-400" />
                  Criar peças únicas que ninguém mais tem
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-gradient-to-r from-pink-500 to-orange-400" />
                  Unir tecnologia com criatividade
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <CatchGame />
        </div>

      </div>
      </div>
    </div>
  );
}
