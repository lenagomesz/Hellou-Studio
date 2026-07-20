'use client';

import { useState, useMemo } from 'react';
import { Calculator, Package, Printer, DollarSign, Info, RotateCcw } from 'lucide-react';
import { CatalogAssistant } from '@/components/admin/CatalogAssistant';

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

const DEFAULTS = {
  pesoGramas: '',
  precoKg: '120',
  tempoHoras: '',
  tempoMinutos: '',
  potenciaWatts: '220',
  custoKwh: '0.85',
  custoDesgasteHora: '2.50',
  tempoPreparoMinutos: '15',
  valorHoraMaoDeObra: '10',
  custosFalha: '10',
  taxaMP: '4.99',
};

const TAXAS_MP = [
  { label: 'PIX', value: '0.99' },
  { label: 'Crédito à vista', value: '4.99' },
  { label: 'Débito', value: '1.99' },
];

function InputField({ label, value, onChange, placeholder, min, max, step, suffix, hint }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  min?: string;
  max?: string;
  step?: string;
  suffix?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
      <div className="relative">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          min={min ?? '0'}
          max={max}
          step={step ?? '0.01'}
          className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/40 focus:border-pink-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white transition"
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">{suffix}</span>
        )}
      </div>
      {hint && <p className="mt-0.5 text-[10px] text-gray-400">{hint}</p>}
    </div>
  );
}

export default function CalculadoraPage() {
  const [form, setForm] = useState(DEFAULTS);
  const [precoSimulado, setPrecoSimulado] = useState('');

  function updateField(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function resetForm() {
    setForm(DEFAULTS);
    setPrecoSimulado('');
  }

  function arredondarPreco(valor: number): number {
    if (valor <= 10) return Math.ceil(valor);
    if (valor <= 30) return Math.ceil(valor * 2) / 2;
    if (valor <= 100) return Math.round(valor);
    return Math.ceil(valor / 5) * 5;
  }

  const resultado = useMemo(() => {
    const peso = Number(form.pesoGramas) || 0;
    const precoKg = Number(form.precoKg) || 0;
    const horas = (Number(form.tempoHoras) || 0) + (Number(form.tempoMinutos) || 0) / 60;
    const potencia = Number(form.potenciaWatts) || 0;
    const custoKwh = Number(form.custoKwh) || 0;
    const desgasteHora = Number(form.custoDesgasteHora) || 0;
    const preparoHoras = (Number(form.tempoPreparoMinutos) || 0) / 60;
    const valorHora = Number(form.valorHoraMaoDeObra) || 0;
    const percFalha = Number(form.custosFalha) || 0;

    if (peso === 0 && horas === 0) return null;

    const custoFilamento = (peso / 1000) * precoKg;
    const custoEnergia = (potencia / 1000) * horas * custoKwh;
    const custoDesgaste = desgasteHora * horas;
    const custoMaoDeObra = preparoHoras * valorHora;

    const custoBase = custoFilamento + custoEnergia + custoDesgaste + custoMaoDeObra;
    const custoTotal = custoBase * (1 + percFalha / 100);

    const sugestoes = [2.0, 2.5, 3.0, 3.5].map(m => ({
      markup: m,
      preco: arredondarPreco(Math.max(custoTotal * m, 15)),
    }));

    return {
      custoFilamento,
      custoEnergia,
      custoDesgaste,
      custoMaoDeObra,
      custoTotal,
      sugestoes,
    };
  }, [form]);

  const simulacao = useMemo(() => {
    if (!resultado) return null;
    const preco = Number(precoSimulado) || 0;
    if (preco <= 0) return null;

    const taxaPerc = Number(form.taxaMP) || 0;
    const taxaValor = preco * (taxaPerc / 100);
    const lucro = preco - resultado.custoTotal - taxaValor;
    const margem = (lucro / preco) * 100;

    return { preco, taxaValor, lucro, margem };
  }, [precoSimulado, resultado, form.taxaMP]);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Calculator className="h-6 w-6 text-pink-500" />
            Calculadora de Preço
          </h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            Calcule o custo e simule preços para encontrar o melhor lucro
          </p>
        </div>
        <button
          type="button"
          onClick={resetForm}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Limpar
        </button>
      </header>

      <CatalogAssistant
        weightGrams={form.pesoGramas}
        filamentPricePerKg={form.precoKg}
        hours={form.tempoHoras}
        minutes={form.tempoMinutos}
        onUseSuggestedPrice={(price) => setPrecoSimulado(String(price))}
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
        {/* Formulário */}
        <div className="space-y-5">
          {/* Dados da peça - seção principal */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-pink-50 dark:bg-pink-900/30">
                <Package className="h-4 w-4 text-pink-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Dados da Peça</h2>
                <p className="text-[11px] text-gray-500">Informações do slicer (Cura, PrusaSlicer, etc)</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <InputField
                label="Peso (gramas)"
                value={form.pesoGramas}
                onChange={(v) => updateField('pesoGramas', v)}
                placeholder="45"
                step="0.1"
                suffix="g"
                hint="Peso estimado pelo slicer"
              />
              <InputField
                label="Tempo (horas)"
                value={form.tempoHoras}
                onChange={(v) => updateField('tempoHoras', v)}
                placeholder="3"
                step="1"
                suffix="h"
              />
              <InputField
                label="Tempo (minutos)"
                value={form.tempoMinutos}
                onChange={(v) => updateField('tempoMinutos', v)}
                placeholder="30"
                max="59"
                step="1"
                suffix="min"
              />
            </div>
          </div>

          {/* Custos fixos - colapsáveis */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-900/30">
                <Printer className="h-4 w-4 text-violet-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Custos de Produção</h2>
                <p className="text-[11px] text-gray-500">Valores padrão já preenchidos, ajuste se necessário</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <InputField
                label="Preço do filamento"
                value={form.precoKg}
                onChange={(v) => updateField('precoKg', v)}
                placeholder="120"
                suffix="R$/kg"
              />
              <InputField
                label="Potência da impressora"
                value={form.potenciaWatts}
                onChange={(v) => updateField('potenciaWatts', v)}
                placeholder="220"
                suffix="W"
              />
              <InputField
                label="Custo da energia"
                value={form.custoKwh}
                onChange={(v) => updateField('custoKwh', v)}
                placeholder="0.85"
                suffix="R$/kWh"
              />
              <InputField
                label="Desgaste da máquina"
                value={form.custoDesgasteHora}
                onChange={(v) => updateField('custoDesgasteHora', v)}
                placeholder="2.50"
                suffix="R$/h"
              />
              <InputField
                label="Preparo manual"
                value={form.tempoPreparoMinutos}
                onChange={(v) => updateField('tempoPreparoMinutos', v)}
                placeholder="15"
                suffix="min"
                hint="Lixar, limpar, pintar, embalar"
              />
              <InputField
                label="Sua hora de trabalho"
                value={form.valorHoraMaoDeObra}
                onChange={(v) => updateField('valorHoraMaoDeObra', v)}
                placeholder="30"
                suffix="R$/h"
                hint="Só cobra sobre o preparo manual"
              />
            </div>
          </div>

          {/* Taxas e margens */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-900/30">
                <DollarSign className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Taxas</h2>
                <p className="text-[11px] text-gray-500">Margem de falha e taxa de pagamento</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <InputField
                label="Taxa de falha"
                value={form.custosFalha}
                onChange={(v) => updateField('custosFalha', v)}
                placeholder="10"
                max="100"
                step="1"
                suffix="%"
                hint="5-10% experiente, 15-20% iniciante"
              />
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Pagamento (Mercado Pago)
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {TAXAS_MP.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => updateField('taxaMP', t.value)}
                      className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                        form.taxaMP === t.value
                          ? 'bg-orange-500 text-white shadow-sm'
                          : 'border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800'
                      }`}
                    >
                      {t.label} {t.value}%
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  value={form.taxaMP}
                  onChange={(e) => updateField('taxaMP', e.target.value)}
                  min="0"
                  max="100"
                  step="0.01"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/40 focus:border-pink-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white transition"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Resultado - sticky lateral */}
        <div className="xl:sticky xl:top-6 xl:self-start space-y-4">
          {resultado ? (
            <>
              {/* Composição do custo */}
              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <h3 className="text-xs font-semibold text-gray-800 dark:text-gray-200 uppercase tracking-wide mb-3">Custo de produção</h3>
                <div className="space-y-2.5">
                  {[
                    { label: 'Filamento', value: resultado.custoFilamento, color: 'bg-pink-500' },
                    { label: 'Energia', value: resultado.custoEnergia, color: 'bg-yellow-500' },
                    { label: 'Desgaste', value: resultado.custoDesgaste, color: 'bg-violet-500' },
                    { label: 'Mão de obra', value: resultado.custoMaoDeObra, color: 'bg-blue-500' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${item.color}`} />
                        <span className="text-sm text-gray-600 dark:text-gray-400">{item.label}</span>
                      </div>
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{formatPrice(item.value)}</span>
                    </div>
                  ))}
                  <div className="border-t border-gray-100 pt-2 dark:border-gray-800">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Custo total</span>
                      <span className="text-lg font-bold text-gray-900 dark:text-white">{formatPrice(resultado.custoTotal)}</span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">Inclui {form.custosFalha}% de margem de falha</p>
                  </div>
                </div>
              </div>

              {/* Sugestões de preço */}
              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <h3 className="text-xs font-semibold text-gray-800 dark:text-gray-200 uppercase tracking-wide mb-3">Sugestões de preço</h3>
                <div className="grid grid-cols-2 gap-2">
                  {resultado.sugestoes.map((s) => (
                    <button
                      key={s.markup}
                      type="button"
                      onClick={() => setPrecoSimulado(String(s.preco))}
                      className="rounded-xl border border-gray-200 p-3 text-left hover:border-pink-300 hover:bg-pink-50/50 transition dark:border-gray-700 dark:hover:border-pink-700 dark:hover:bg-pink-950/20"
                    >
                      <p className="text-[10px] font-medium text-gray-500 uppercase">{s.markup}x markup</p>
                      <p className="text-base font-bold text-gray-900 dark:text-white">{formatPrice(s.preco)}</p>
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[10px] text-gray-400">Clique para simular ou digite seu preço abaixo</p>
              </div>

              {/* Simulador de preço - INPUT DO USUÁRIO */}
              <div className="rounded-2xl border-2 border-pink-200 bg-gradient-to-br from-pink-50 to-orange-50 p-5 shadow-sm dark:border-pink-800 dark:from-pink-950/30 dark:to-orange-950/30">
                <h3 className="text-xs font-semibold text-pink-600 dark:text-pink-400 uppercase tracking-wide mb-3">Simular meu preço</h3>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500">R$</span>
                  <input
                    type="number"
                    value={precoSimulado}
                    onChange={(e) => setPrecoSimulado(e.target.value)}
                    placeholder="Digite o preço da loja"
                    min="0"
                    step="0.50"
                    className="w-full rounded-xl border border-pink-200 bg-white pl-9 pr-3 py-3 text-lg font-bold text-gray-900 placeholder:text-gray-400 placeholder:font-normal placeholder:text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/40 focus:border-pink-400 dark:border-pink-800 dark:bg-gray-800 dark:text-white transition"
                  />
                </div>

                {simulacao ? (
                  <div className="mt-4 space-y-2.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Preço de venda</span>
                      <span className="font-medium text-gray-800 dark:text-gray-200">{formatPrice(simulacao.preco)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-red-500">− Custo de produção</span>
                      <span className="font-medium text-red-500">{formatPrice(resultado.custoTotal)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-orange-500">− Taxa MP ({form.taxaMP}%)</span>
                      <span className="font-medium text-orange-500">{formatPrice(simulacao.taxaValor)}</span>
                    </div>
                    <div className="border-t border-pink-200/60 pt-2 dark:border-pink-800/60">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-bold ${simulacao.lucro >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>= Lucro líquido</span>
                        <span className={`text-lg font-bold ${simulacao.lucro >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatPrice(simulacao.lucro)}</span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-gray-500">Margem líquida</span>
                        <span className={`text-sm font-semibold ${simulacao.margem >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{simulacao.margem.toFixed(1)}%</span>
                      </div>
                    </div>
                    {simulacao.lucro < 0 && (
                      <p className="text-[11px] text-red-500 font-medium mt-1">Preço abaixo do custo — você terá prejuízo!</p>
                    )}
                    {simulacao.margem > 0 && simulacao.margem < 20 && (
                      <p className="text-[11px] text-amber-600 font-medium mt-1">Margem baixa — considere um valor maior</p>
                    )}
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-gray-400 text-center">Digite um preço para ver o lucro</p>
                )}
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-8 text-center dark:border-gray-800 dark:bg-gray-900/50">
              <Calculator className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
              <p className="mt-3 text-sm font-medium text-gray-500 dark:text-gray-400">Resultado em tempo real</p>
              <p className="mt-1 text-xs text-gray-400">Preencha o peso ou tempo da peça para ver o cálculo</p>
            </div>
          )}

          {/* Dicas */}
          <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-900/50 dark:bg-blue-950/20">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
              <div className="text-[11px] text-blue-700 dark:text-blue-300 space-y-1">
                <p><strong>2.0x</strong> — peças simples, alta tiragem</p>
                <p><strong>2.5x</strong> — peças personalizadas, encomendas</p>
                <p><strong>3.0x+</strong> — peças artísticas, complexas, sob demanda</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
