import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Termos de Uso e Política de Privacidade | Hellou Studio',
  description: 'Termos de uso, política de privacidade, cookies e direitos previstos pela LGPD na Hellou Studio.',
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white font-display">
        Termos de Uso e Política de Privacidade
      </h1>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Última atualização: 14 de julho de 2026</p>

      <div className="mt-10 space-y-10 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
        {/* Termos de Uso */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white font-display">1. Termos de Uso</h2>

          <h3 className="mt-4 font-semibold text-gray-800 dark:text-gray-200">1.1 Aceitação dos Termos</h3>
          <p className="mt-2">
            Ao acessar e utilizar o site da Hellou Studio, você concorda com estes Termos de Uso.
            Caso não concorde com qualquer parte destes termos, recomendamos que não utilize nossos serviços.
          </p>

          <h3 className="mt-4 font-semibold text-gray-800 dark:text-gray-200">1.2 Descrição do Serviço</h3>
          <p className="mt-2">
            A Hellou Studio é uma loja virtual especializada na venda de produtos fabricados por
            impressão 3D. Os produtos são confeccionados sob demanda e podem ter prazo de produção
            variável, informado no momento da compra.
          </p>

          <h3 className="mt-4 font-semibold text-gray-800 dark:text-gray-200">1.3 Cadastro</h3>
          <p className="mt-2">
            Para realizar compras, é necessário criar uma conta com informações verdadeiras e
            atualizadas. Você é responsável por manter a confidencialidade de suas credenciais
            de acesso. Cada pessoa física pode possuir apenas uma conta.
          </p>

          <h3 className="mt-4 font-semibold text-gray-800 dark:text-gray-200">1.4 Preços e Pagamento</h3>
          <p className="mt-2">
            Os preços dos produtos são exibidos em Reais (R$) e podem ser alterados sem aviso prévio.
            O preço válido é aquele exibido no momento da finalização da compra. Aceitamos as formas
            de pagamento indicadas na página de checkout.
          </p>

          <h3 className="mt-4 font-semibold text-gray-800 dark:text-gray-200">1.5 Entrega</h3>
          <p className="mt-2">
            Os prazos de entrega são estimativas e podem variar de acordo com a região e a
            disponibilidade de produção. A Hellou Studio não se responsabiliza por atrasos
            causados por transportadoras ou fatores externos.
          </p>

          <h3 className="mt-4 font-semibold text-gray-800 dark:text-gray-200">1.6 Trocas e Devoluções</h3>
          <p className="mt-2">
            De acordo com o Código de Defesa do Consumidor, o cliente tem direito de desistir da
            compra em até 7 (sete) dias corridos após o recebimento do produto. O produto deve ser
            devolvido em sua embalagem original, sem sinais de uso. Para produtos personalizados ou
            feitos sob encomenda, não será possível a devolução, exceto em caso de defeito.
          </p>

          <h3 className="mt-4 font-semibold text-gray-800 dark:text-gray-200">1.7 Propriedade Intelectual</h3>
          <p className="mt-2">
            Todo o conteúdo do site (imagens, textos, logotipos, designs de produtos) é de
            propriedade da Hellou Studio e está protegido por leis de propriedade intelectual.
            É proibida a reprodução sem autorização prévia.
          </p>

          <h3 className="mt-4 font-semibold text-gray-800 dark:text-gray-200">1.8 Uso Adequado</h3>
          <p className="mt-2">
            O usuário se compromete a não utilizar o site para fins ilegais, não tentar acessar
            áreas restritas do sistema e não realizar ações que possam prejudicar o funcionamento
            da plataforma.
          </p>
        </section>

        {/* Política de Privacidade */}
        <section id="privacidade" className="scroll-mt-24">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white font-display">2. Política de Privacidade</h2>

          <h3 className="mt-4 font-semibold text-gray-800 dark:text-gray-200">2.1 Dados Coletados</h3>
          <p className="mt-2">Coletamos os seguintes dados pessoais:</p>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>Nome completo</li>
            <li>Endereço de email</li>
            <li>Número de telefone/WhatsApp</li>
            <li>Endereço de entrega</li>
            <li>Dados de pagamento (processados por terceiros)</li>
            <li>Eventos de navegação, apenas quando você autoriza cookies de análise</li>
          </ul>

          <h3 className="mt-4 font-semibold text-gray-800 dark:text-gray-200">2.2 Finalidade do Uso dos Dados</h3>
          <p className="mt-2">Seus dados são utilizados para:</p>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>Processar e entregar pedidos</li>
            <li>Comunicar atualizações sobre seus pedidos via email ou WhatsApp</li>
            <li>Enviar promoções e novidades (apenas com seu consentimento)</li>
            <li>Melhorar a experiência de uso do site</li>
            <li>Cumprir obrigações legais</li>
          </ul>

          <h3 className="mt-4 font-semibold text-gray-800 dark:text-gray-200">2.3 Compartilhamento de Dados</h3>
          <p className="mt-2">
            Seus dados pessoais não são vendidos a terceiros. Podemos compartilhar informações
            apenas com parceiros essenciais para a operação (transportadoras, processadores de
            pagamento) e quando exigido por lei.
          </p>

          <h3 className="mt-4 font-semibold text-gray-800 dark:text-gray-200">2.4 Segurança</h3>
          <p className="mt-2">
            Adotamos medidas técnicas e organizacionais para proteger seus dados contra acesso
            não autorizado, perda ou alteração. Utilizamos criptografia e armazenamento seguro.
          </p>

          <h3 className="mt-4 font-semibold text-gray-800 dark:text-gray-200">2.5 Seus Direitos (LGPD)</h3>
          <p className="mt-2">
            Conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você tem direito a:
          </p>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>Acessar seus dados pessoais</li>
            <li>Corrigir dados incompletos ou desatualizados</li>
            <li>Solicitar a exclusão dos seus dados</li>
            <li>Revogar consentimentos concedidos</li>
            <li>Solicitar portabilidade dos dados</li>
          </ul>
          <p className="mt-2">
            Para exercer qualquer destes direitos, entre em contato pelo email informado em nosso site.
          </p>

          <h3 className="mt-4 font-semibold text-gray-800 dark:text-gray-200">2.6 Cookies</h3>
          <p className="mt-2">
            Cookies necessários mantêm o login, a segurança, o tema e o funcionamento do carrinho.
            Cookies de análise e personalização permanecem desativados até que você autorize. Sua
            escolha fica registrada por até 12 meses e pode ser alterada a qualquer momento em
            “Preferências de cookies”, no rodapé do site.
          </p>

          <h3 className="mt-4 font-semibold text-gray-800 dark:text-gray-200">2.7 Alterações nesta Política</h3>
          <p className="mt-2">
            Reservamo-nos o direito de atualizar esta política a qualquer momento. Alterações
            significativas serão comunicadas por email ou destaque no site.
          </p>
        </section>

        {/* Contato */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white font-display">3. Contato</h2>
          <p className="mt-2">
            Em caso de dúvidas, sugestões ou solicitações relacionadas a estes termos ou à sua
            privacidade, entre em contato conosco através dos canais disponíveis em nosso site.
          </p>
        </section>
      </div>
    </main>
  );
}
