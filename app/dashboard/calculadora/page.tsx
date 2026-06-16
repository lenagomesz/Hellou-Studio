'use client';

import { useState } from 'react';
import { Calculator, Zap, Clock, DollarSign, Package, Printer, Info, CreditCard } from 'lucide-react';

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

interface Resultado {
  custoFilamento: number;
  custoEnergia: number;
  custoDesgaste: number;
  custoMaoDeObra: number;
  custoTotal: number;
  precoSugerido: number;
  lucro: number;
  margemLucro: number;
  taxaMPValor: number;
  lucroLiquido: number;
  margemLiquida: number;
}

const TAXAS_MP = [
  { label: 'PIX', value: '0.99' },
  { label: 'Crédito à vista', value: '4.99' },
  { label: 'Débito', value: '1.99' },
];

export default function CalculadoraPage() {
  const [form, setForm] = useState({
    pesoGramas: '',
    precoKg: '120',
    tempoHoras: '',
    tempoMinutos: '',
    potenciaWatts: '350',
    custoKwh: '0.85',
    custoDesgasteHora: '2.50',
    tempoPreparoMinutos: '15',
    valorHoraMaoDeObra: '30',
    markup: '2.5',
    custosFalha: '10',
    taxaMP: '4.99',
  });

  const [resultado, setResultado] = useState<Resultado | null>(null);

  function calcular(e: React.FormEvent) {
    e.preventDefault();

    const peso = Number(form.pesoGramas) || 0;
    const precoKg = Number(form.precoKg) || 0;
    const horas = (Number(form.tempoHoras) || 0) + (Number(form.tempoMinutos) || 0) / 60;
    const potencia = Number(form.potenciaWatts) || 0;
    const custoKwh = Number(form.custoKwh) || 0;
    const desgasteHora = Number(form.custoDesgasteHora) || 0;
    const preparoHoras = (Number(form.tempoPreparoMinutos) || 0) / 60;
    const valorHora = Number(form.valorHoraMaoDeObra) || 0;
    const markup = Number(form.markup) || 1;
    const percFalha = Number(form.custosFalha) || 0;

    const custoFilamento = (peso / 1000) * precoKg;
    const custoEnergia = (potencia / 1000) * horas * custoKwh;
    const custoDesgaste = desgasteHora * horas;
    const custoMaoDeObra = preparoHoras * valorHora;

    const custoBase = custoFilamento + custoEnergia + custoDesgaste + custoMaoDeObra;
    const custoTotal = custoBase * (1 + percFalha / 100);
    const precoSugerido = custoTotal * markup;
    const lucro = precoSugerido - custoTotal;
    const margemLucro = precoSugerido > 0 ? (lucro / precoSugerido) * 100 : 0;

    const taxaPerc = Number(form.taxaMP) || 0;
    const taxaMPValor = precoSugerido * (taxaPerc / 100);
    const lucroLiquido = lucro - taxaMPValor;
    const margemLiquida = precoSugerido > 0 ? (lucroLiquido / precoSugerido) * 100 : 0;

    setResultado({
      custoFilamento,
      custoEnergia,
      custoDesgaste,
      custoMaoDeObra,
      custoTotal,
      precoSugerido,
      lucro,
      margemLucro,
      taxaMPValor,
      lucroLiquido,
      margemLiquida,
    });
  }

  function updateField(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Calculadora de Custos</h1>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
          Calcule o custo de impressão 3D e defina o preço ideal de venda
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Form */}
        <form onSubmit={calcular} className="space-y-6">
          {/* Filamento */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-pink-50 dark:bg-pink-900/30">
                <Package className="h-4 w-4 text-pink-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Filamento</h2>
                <p className="text-[11px] text-gray-500">Material utilizado na impressão</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Peso da peça (gramas)</label>
                <input
                  type="number"
                  value={form.pesoGramas}
                  onChange={(e) => updateField('pesoGramas', e.target.value)}
                  placeholder="Ex: 45"
                  required
                  min="0"
                  step="0.1"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Preço do kg de filamento (R$)</label>
                <input
                  type="number"
                  value={form.precoKg}
                  onChange={(e) => updateField('precoKg', e.target.value)}
                  placeholder="Ex: 120"
                  required
                  min="0"
                  step="0.01"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Tempo */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/30">
                <Clock className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Tempo de Impressão</h2>
                <p className="text-[11px] text-gray-500">Tempo estimado pelo slicer</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Horas</label>
                <input
                  type="number"
                  value={form.tempoHoras}
                  onChange={(e) => updateField('tempoHoras', e.target.value)}
                  placeholder="Ex: 3"
                  min="0"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Minutos</label>
                <input
                  type="number"
                  value={form.tempoMinutos}
                  onChange={(e) => updateField('tempoMinutos', e.target.value)}
                  placeholder="Ex: 30"
                  min="0"
                  max="59"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Energia */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-50 dark:bg-yellow-900/30">
                <Zap className="h-4 w-4 text-yellow-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Energia Elétrica</h2>
                <p className="text-[11px] text-gray-500">Consumo da impressora</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Potência da impressora (Watts)</label>
                <input
                  type="number"
                  value={form.potenciaWatts}
                  onChange={(e) => updateField('potenciaWatts', e.target.value)}
                  placeholder="Ex: 350"
                  min="0"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Custo do kWh (R$)</label>
                <input
                  type="number"
                  value={form.custoKwh}
                  onChange={(e) => updateField('custoKwh', e.target.value)}
                  placeholder="Ex: 0.85"
                  min="0"
                  step="0.01"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Desgaste + Mão de obra */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-900/30">
                <Printer className="h-4 w-4 text-violet-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Desgaste e Mão de Obra</h2>
                <p className="text-[11px] text-gray-500">Custos operacionais</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Desgaste da máquina (R$/hora)</label>
                <input
                  type="number"
                  value={form.custoDesgasteHora}
                  onChange={(e) => updateField('custoDesgasteHora', e.target.value)}
                  placeholder="Ex: 2.50"
                  min="0"
                  step="0.01"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Tempo de preparo (minutos)</label>
                <input
                  type="number"
                  value={form.tempoPreparoMinutos}
                  onChange={(e) => updateField('tempoPreparoMinutos', e.target.value)}
                  placeholder="Ex: 15"
                  min="0"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Valor da sua hora (R$)</label>
                <input
                  type="number"
                  value={form.valorHoraMaoDeObra}
                  onChange={(e) => updateField('valorHoraMaoDeObra', e.target.value)}
                  placeholder="Ex: 30"
                  min="0"
                  step="0.01"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Taxa de falha (%)</label>
                <input
                  type="number"
                  value={form.custosFalha}
                  onChange={(e) => updateField('custosFalha', e.target.value)}
                  placeholder="Ex: 10"
                  min="0"
                  max="100"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Markup */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-900/30">
                <DollarSign className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Precificação</h2>
                <p className="text-[11px] text-gray-500">Multiplicador de lucro sobre o custo</p>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Markup (multiplicador) — Ex: 2.0 = 100% de lucro, 2.5 = 150%, 3.0 = 200%
              </label>
              <input
                type="number"
                value={form.markup}
                onChange={(e) => updateField('markup', e.target.value)}
                placeholder="Ex: 2.5"
                required
                min="1"
                step="0.1"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>

          {/* Taxa MP */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 dark:bg-orange-900/30">
                <CreditCard className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Taxa do Meio de Pagamento</h2>
                <p className="text-[11px] text-gray-500">Percentual cobrado pelo Mercado Pago</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Método</label>
                <select
                  value={TAXAS_MP.find(t => t.value === form.taxaMP)?.value ?? ''}
                  onChange={(e) => { if (e.target.value) updateField('taxaMP', e.target.value); }}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  {TAXAS_MP.map(t => (
                    <option key={t.value} value={t.value}>{t.label} ({t.value}%)</option>
                  ))}
                  <option value="">Personalizado</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Taxa (%)</label>
                <input
                  type="number"
                  value={form.taxaMP}
                  onChange={(e) => updateField('taxaMP', e.target.value)}
                  placeholder="Ex: 4.99"
                  min="0"
                  max="100"
                  step="0.01"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
            </div>
          </div>

          <button type="submit" className="w-full rounded-xl bg-gradient-to-r from-pink-500 to-orange-400 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition">
            <Calculator className="inline h-4 w-4 mr-2" />
            Calcular preço
          </button>
        </form>

        {/* Resultado */}
        <div className="space-y-4">
          {resultado ? (
            <>
              {/* Preço sugerido */}
              <div className="rounded-2xl border-2 border-pink-200 bg-gradient-to-br from-pink-50 to-orange-50 p-6 shadow-sm dark:border-pink-800 dark:from-pink-950/30 dark:to-orange-950/30">
                <p className="text-xs font-semibold uppercase tracking-wide text-pink-600">Preço sugerido de venda</p>
                <p className="mt-2 text-4xl font-bold text-gray-900 dark:text-white">{formatPrice(resultado.precoSugerido)}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/40 dark:text-green-300">
                    Lucro bruto: {formatPrice(resultado.lucro)}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                    Margem: {resultado.margemLucro.toFixed(1)}%
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                    Lucro líquido: {formatPrice(resultado.lucroLiquido)}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                    Margem líquida: {resultado.margemLiquida.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Breakdown */}
              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">Detalhamento dos custos</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-pink-500" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Filamento</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{formatPrice(resultado.custoFilamento)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-yellow-500" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Energia elétrica</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{formatPrice(resultado.custoEnergia)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-violet-500" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Desgaste da máquina</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{formatPrice(resultado.custoDesgaste)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-blue-500" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Mão de obra</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{formatPrice(resultado.custoMaoDeObra)}</span>
                  </div>
                  <div className="border-t border-gray-100 pt-3 dark:border-gray-800">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">Custo total (com falha)</span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">{formatPrice(resultado.custoTotal)}</span>
                    </div>
                  </div>
                  <div className="border-t border-gray-100 pt-3 dark:border-gray-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-orange-500" />
                        <span className="text-sm text-orange-700 dark:text-orange-300">Taxa Mercado Pago ({form.taxaMP}%)</span>
                      </div>
                      <span className="text-sm font-semibold text-orange-700 dark:text-orange-300">-{formatPrice(resultado.taxaMPValor)}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Você recebe (líquido)</span>
                      <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{formatPrice(resultado.precoSugerido - resultado.taxaMPValor)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dicas */}
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                  <div className="text-xs text-blue-800 dark:text-blue-300 space-y-1">
                    <p><strong>Markup 2.0:</strong> Dobra o custo. Bom para peças simples.</p>
                    <p><strong>Markup 2.5-3.0:</strong> Ideal para peças personalizadas e encomendas.</p>
                    <p><strong>Markup 3.0+:</strong> Para peças artísticas, complexas ou sob demanda.</p>
                    <p className="mt-2"><strong>Taxa de falha:</strong> 5-10% para quem já tem experiência, 15-20% para iniciantes.</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm text-center dark:border-gray-800 dark:bg-gray-900">
              <Calculator className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-3 text-sm text-gray-500">Preencha os dados e clique em calcular para ver o preço sugerido</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
