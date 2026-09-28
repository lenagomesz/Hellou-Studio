import Link from 'next/link';
import { DEFAULT_PRODUCTION_LEAD_TIME } from '@/lib/production';

const STEPS = [
  { number: '01', title: 'Você escolhe', text: 'Encontre uma peça no catálogo ou envie uma imagem, arquivo STL ou link de referência.' },
  { number: '02', title: 'Nós produzimos', text: 'Cada pedido é preparado com cuidado, cor escolhida e atenção aos detalhes da personalização.' },
  { number: '03', title: 'Você acompanha', text: 'Depois da produção, enviamos com rastreio para você acompanhar a chegada da sua peça.' },
];

const FAQS = [
  { question: 'Quanto tempo leva para produzir?', answer: `As peças do catálogo são produzidas em ${DEFAULT_PRODUCTION_LEAD_TIME}. Encomendas personalizadas recebem um prazo no orçamento, conforme o modelo e a quantidade.` },
  { question: 'Posso escolher a cor?', answer: 'Sim. As cores disponíveis aparecem nas opções de cada produto. Em uma encomenda, conte qual cor ou acabamento você imagina.' },
  { question: 'Como funciona uma encomenda?', answer: 'Você envia uma imagem, STL ou link. Avaliamos a viabilidade e a licença comercial quando houver modelo de terceiros, então enviamos o orçamento antes de produzir.' },
  { question: 'O que é PLA?', answer: 'É o material usado na maior parte das peças. Ele vem de fontes renováveis, tem bom acabamento e é indicado para o uso cotidiano da peça.' },
  { question: 'Vocês enviam para todo o Brasil?', answer: 'Sim. O frete é calculado no carrinho e o pedido segue com rastreio após a produção.' },
];

export default function AboutPage() {
  return (
    <div className="bg-[#fffaf8] text-gray-900 dark:bg-gray-950 dark:text-white">
      <section className="relative overflow-hidden bg-gradient-to-br from-pink-600 via-pink-500 to-orange-400 px-4 py-12 text-center text-white sm:px-6 sm:py-24">
        <div className="pointer-events-none absolute -left-20 bottom-0 h-64 w-64 rounded-full bg-white/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 top-0 h-64 w-64 rounded-full bg-orange-100/30 blur-3xl" />
        <div className="relative mx-auto max-w-3xl">
          <p className="inline-flex rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white/90 backdrop-blur-sm sm:text-xs">Por trás da Hellou Studio</p>
          <h1 className="mt-5 text-3xl font-black leading-[1.02] tracking-[-0.04em] sm:text-5xl">Feito em camadas,<br />pensado para o seu cantinho.</h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-6 text-white/90 sm:text-lg">Peças impressas em 3D para presentear, organizar e deixar a rotina com mais personalidade.</p>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-20">
        <Link href="/" className="inline-flex min-h-10 items-center rounded-full bg-white px-4 text-sm font-semibold text-pink-600 shadow-sm ring-1 ring-pink-100 transition hover:text-orange-500 dark:bg-gray-900 dark:text-pink-400 dark:ring-gray-800">← Voltar para a loja</Link>

        <section className="grid gap-6 py-10 sm:py-16 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-pink-600 dark:text-pink-400">Oi, eu sou a Helena</p>
            <h2 className="mt-3 text-2xl font-black leading-[1.1] tracking-tight sm:text-4xl">Ideias que saem da tela e viram parte da sua história.</h2>
            <div className="mt-5 space-y-3 text-sm leading-6 text-gray-600 dark:text-gray-300 sm:text-base sm:leading-7">
              <p>A Hellou Studio nasceu para transformar impressão 3D em peças que fazem sentido no dia a dia: um presente com nome, um detalhe para a mesa, um organizador ou aquela ideia que você queria tirar do papel.</p>
              <p>Cada pedido é produzido com cuidado, uma camada por vez. Você escolhe os detalhes; eu cuido de transformar isso em uma peça bonita, útil e com a sua cara.</p>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-[1.75rem] border border-pink-100 bg-gradient-to-br from-pink-50 via-white to-orange-50 p-6 shadow-[0_20px_50px_-35px_rgba(219,39,119,.7)] dark:border-pink-900/60 dark:from-pink-950/30 dark:via-gray-900 dark:to-orange-950/20 sm:rounded-3xl sm:p-9">
            <div className="pointer-events-none absolute -right-9 -top-9 h-32 w-32 rounded-full bg-pink-200/45 blur-2xl dark:bg-pink-500/15" />
            <div className="relative"><span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm ring-1 ring-pink-100 dark:bg-gray-900 dark:ring-pink-900" aria-hidden="true">🖨️</span>
            <p className="mt-5 text-[10px] font-black uppercase tracking-[0.18em] text-pink-600 dark:text-pink-400">Feito camada por camada</p>
            <h3 className="mt-2 text-lg font-black sm:text-xl">Impressão 3D com intenção</h3>
            <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">As pequenas linhas da impressão fazem parte da história de uma peça produzida especialmente para você.</p></div>
          </div>
        </section>

        <section className="border-y border-pink-100 py-10 dark:border-gray-800 sm:py-16">
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-pink-600 dark:text-pink-400">Como funciona</p>
            <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-4xl">Do seu jeito, do começo ao fim.</h2>
          </div>
          <div className="mt-7 grid gap-3 sm:grid-cols-3 sm:gap-6">
            {STEPS.map((step) => <article key={step.number} className="group rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-pink-200 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-pink-900 sm:p-6">
              <div className="flex items-center justify-between"><span className="inline-flex rounded-full bg-pink-50 px-2.5 py-1 text-xs font-bold text-pink-600 dark:bg-pink-950/40 dark:text-pink-300">{step.number}</span><span className="text-pink-200 transition group-hover:translate-x-0.5 group-hover:text-pink-500 dark:text-pink-900 dark:group-hover:text-pink-400" aria-hidden="true">→</span></div>
              <h3 className="mt-3 text-base font-black sm:mt-5 sm:text-lg">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-6 text-gray-600 dark:text-gray-300 sm:mt-2">{step.text}</p>
            </article>)}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 py-10 sm:grid-cols-3 sm:gap-4 sm:py-16">
          <article className="rounded-2xl border border-green-100 bg-green-50/70 p-4 dark:border-green-900/60 dark:bg-green-950/20 sm:p-5"><span aria-hidden="true">♻️</span><h2 className="mt-2 text-sm font-bold sm:mt-3 sm:text-base">Material PLA</h2><p className="mt-1.5 text-xs leading-5 text-gray-600 dark:text-gray-300 sm:mt-2 sm:text-sm sm:leading-6">Material de fontes renováveis, com acabamento agradável e ideal para a maior parte dos usos do dia a dia.</p></article>
          <article className="rounded-2xl border border-orange-100 bg-orange-50/70 p-4 dark:border-orange-900/60 dark:bg-orange-950/20 sm:p-5"><span aria-hidden="true">⏱️</span><h2 className="mt-2 text-sm font-bold sm:mt-3 sm:text-base">Feito sob demanda</h2><p className="mt-1.5 text-xs leading-5 text-gray-600 dark:text-gray-300 sm:mt-2 sm:text-sm sm:leading-6">A produção começa depois da confirmação do pedido, para preparar suas escolhas com atenção.</p></article>
          <article className="col-span-2 rounded-2xl border border-blue-100 bg-blue-50/70 p-4 dark:border-blue-900/60 dark:bg-blue-950/20 sm:col-span-1 sm:p-5"><span aria-hidden="true">📦</span><h2 className="mt-2 text-sm font-bold sm:mt-3 sm:text-base">Envio acompanhado</h2><p className="mt-1.5 text-xs leading-5 text-gray-600 dark:text-gray-300 sm:mt-2 sm:text-sm sm:leading-6">Depois de pronto, o pedido segue com rastreio para qualquer lugar do Brasil.</p></article>
        </section>

        <section className="mx-auto max-w-3xl pb-10 sm:pb-16">
          <p className="text-center text-xs font-black uppercase tracking-[0.18em] text-pink-600 dark:text-pink-400">Dúvidas frequentes</p>
          <h2 className="mt-3 text-center text-2xl font-black tracking-tight sm:text-4xl">Tudo o que você precisa saber antes de pedir.</h2>
          <div className="mt-7 space-y-2.5">
            {FAQS.map((faq) => <details key={faq.question} className="group rounded-2xl border border-gray-100 bg-white px-4 dark:border-gray-800 dark:bg-gray-900 sm:px-6"><summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 text-sm font-bold sm:text-base">{faq.question}<span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pink-50 text-lg text-pink-500 transition-transform group-open:rotate-45 dark:bg-pink-950/40">+</span></summary><p className="pb-5 text-sm leading-6 text-gray-600 dark:text-gray-300">{faq.answer}</p></details>)}
          </div>
        </section>

        <section className="relative overflow-hidden rounded-[1.9rem] bg-gradient-to-br from-pink-600 via-pink-500 to-orange-400 px-5 py-9 text-center text-white sm:rounded-3xl sm:px-10 sm:py-14">
          <div className="pointer-events-none absolute -left-16 bottom-0 h-40 w-40 rounded-full bg-white/15 blur-3xl" />
          <div className="pointer-events-none absolute -right-16 top-0 h-40 w-40 rounded-full bg-orange-100/25 blur-3xl" />
          <div className="relative">
          <h2 className="text-2xl font-black leading-tight tracking-tight sm:text-3xl">Tem uma ideia diferente?</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/90">Envie uma imagem, STL ou link. Antes de produzir, analisamos a viabilidade e enviamos seu orçamento.</p>
          <Link href="/request-print" className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-black text-pink-600 shadow-lg transition hover:scale-[1.02] hover:text-orange-500 sm:w-auto">Pedir um orçamento →</Link>
          </div>
        </section>
      </main>
    </div>
  );
}
