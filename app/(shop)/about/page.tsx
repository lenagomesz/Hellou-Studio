'use client';

import Link from 'next/link';

export default function AboutPage() {
  return (
    <div>
      {/* Banner */}
      <div className="bg-gradient-to-r from-pink-500 to-orange-400 px-6 py-10 text-center sm:px-10 sm:py-14">
        <h2 className="text-2xl font-bold text-white sm:text-3xl">
          Sobre a helloustudio
        </h2>
        <p className="mt-2 text-sm text-white/90 sm:text-base">
          Onde código encontra criatividade e vira peça 3D.
        </p>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Link href="/" className="text-sm text-gray-500 hover:text-pink-600 transition">
          ← Voltar
        </Link>

        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="space-y-5 text-gray-700 leading-relaxed">
            <p className="text-base">
              E aí! Eu sou a <span className="font-semibold text-gray-900">Helena</span>, criadora da
              {' '}<span className="font-semibold bg-gradient-to-r from-pink-500 to-orange-400 bg-clip-text text-transparent">helloustudio</span>.
            </p>

            <p>
              Tudo começou quando eu finalmente comprei minha impressora 3D. Eu já programava fazia
              um tempo, e quando vi que dava pra juntar as duas coisas, não pensei duas vezes. Comecei
              a modelar umas pecinhas, imprimir pra mim, mostrar pros amigos, e quando vi já tinha
              gente querendo comprar.
            </p>

            <p>
              A helloustudio é isso: um cantinho onde eu crio peças que não existem em loja nenhuma.
              Chaveiros diferentes, coisas úteis pro escritório, bichinhos fofos. Tudo impresso aqui
              por mim, uma peça de cada vez, com calma e capricho.
            </p>

            <p>
              O site inteiro também fui eu que fiz, do zero. Sou dev e gosto de ter controle sobre
              tudo, então aqui cada botão, cada página, cada detalhe foi pensado.
            </p>

            <p>
              Se você tem uma ideia na cabeça e quer ver ela virar realidade, manda seu arquivo .stl
              lá na página de encomendas que eu faço um orçamento rapidinho.
            </p>

            <div className="rounded-xl bg-gradient-to-r from-pink-50 to-orange-50 border border-pink-100 p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Como funciona</h2>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="text-center">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm text-lg">
                    🎨
                  </div>
                  <p className="mt-2 text-xs font-medium text-gray-800">Você escolhe ou envia o modelo</p>
                </div>
                <div className="text-center">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm text-lg">
                    🖨️
                  </div>
                  <p className="mt-2 text-xs font-medium text-gray-800">Imprimo com cuidado e qualidade</p>
                </div>
                <div className="text-center">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm text-lg">
                    📦
                  </div>
                  <p className="mt-2 text-xs font-medium text-gray-800">Envio pra qualquer lugar do Brasil</p>
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-500 italic">
              Obrigada por passar aqui! Qualquer dúvida é só chamar. 💛
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
