'use client';

import { useState } from 'react';
import { Pencil, X, Check, Loader2 } from 'lucide-react';

interface EditableShippingAddressProps {
  orderId: string;
  address: Record<string, unknown>;
  canEdit: boolean;
}

export default function EditableShippingAddress({ orderId, address, canEdit }: EditableShippingAddressProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [currentAddress, setCurrentAddress] = useState(address);

  const [street, setStreet] = useState(String(currentAddress.street || ''));
  const [number, setNumber] = useState(String(currentAddress.number || ''));
  const [complement, setComplement] = useState(String(currentAddress.complement || ''));
  const [neighborhood, setNeighborhood] = useState(String(currentAddress.neighborhood || ''));
  const [city, setCity] = useState(String(currentAddress.city || ''));
  const [state, setState] = useState(String(currentAddress.state || ''));
  const [cep, setCep] = useState(String(currentAddress.cep || ''));

  const name = typeof currentAddress.name === 'string' ? currentAddress.name : '';

  function startEdit() {
    setStreet(String(currentAddress.street || ''));
    setNumber(String(currentAddress.number || ''));
    setComplement(String(currentAddress.complement || ''));
    setNeighborhood(String(currentAddress.neighborhood || ''));
    setCity(String(currentAddress.city || ''));
    setState(String(currentAddress.state || ''));
    setCep(String(currentAddress.cep || ''));
    setError('');
    setEditing(true);
  }

  async function handleSave() {
    if (!street.trim() || !number.trim() || !neighborhood.trim() || !cep.trim()) {
      setError('Preencha os campos obrigatórios');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const res = await fetch(`/api/orders/${orderId}/address`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ street, number, complement, neighborhood, city, state, cep }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao salvar endereço');
        setSaving(false);
        return;
      }

      setCurrentAddress(data.address);
      setEditing(false);
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="mt-6 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Editar endereço de entrega</h2>
          <button
            onClick={() => setEditing(false)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mb-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 px-3 py-2 text-xs text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                CEP <span className="text-pink-500">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={cep}
                onChange={(e) => setCep(e.target.value.replace(/\D/g, '').slice(0, 8))}
                placeholder="00000000"
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500/30"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Rua/Avenida <span className="text-pink-500">*</span>
            </label>
            <input
              type="text"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500/30"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Número <span className="text-pink-500">*</span>
              </label>
              <input
                type="text"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500/30"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Complemento</label>
              <input
                type="text"
                value={complement}
                onChange={(e) => setComplement(e.target.value)}
                placeholder="Apto, bloco..."
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500/30"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Bairro <span className="text-pink-500">*</span>
            </label>
            <input
              type="text"
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500/30"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Cidade</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">UF</label>
              <input
                type="text"
                value={state}
                maxLength={2}
                onChange={(e) => setState(e.target.value.toUpperCase())}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500/30"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={() => setEditing(false)}
            disabled={saving}
            className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-pink-500 to-orange-400 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:shadow-md active:scale-[0.98] disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Salvar
          </button>
        </div>
      </div>
    );
  }

  // Display mode
  const displayStreet = typeof currentAddress.street === 'string' ? currentAddress.street : '';
  const displayNumber = typeof currentAddress.number === 'string' ? currentAddress.number : '';
  const displayComplement = typeof currentAddress.complement === 'string' ? currentAddress.complement : '';
  const displayNeighborhood = typeof currentAddress.neighborhood === 'string' ? currentAddress.neighborhood : '';
  const displayCity = typeof currentAddress.city === 'string' ? currentAddress.city : '';
  const displayState = typeof currentAddress.state === 'string' ? currentAddress.state : '';
  const displayCep = typeof currentAddress.cep === 'string' ? currentAddress.cep : '';

  const line1 = typeof currentAddress.line1 === 'string' ? currentAddress.line1 : '';
  const line2 = typeof currentAddress.line2 === 'string' ? currentAddress.line2 : '';
  const postalCode = typeof currentAddress.postal_code === 'string' ? currentAddress.postal_code : '';
  const isBrazilianFormat = !!displayStreet;

  return (
    <div className="mt-6 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Endereço de entrega</h2>
        {canEdit && (
          <button
            onClick={startEdit}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-700 px-2.5 py-1.5 text-[11px] font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-pink-600 dark:hover:text-pink-400 transition"
          >
            <Pencil className="h-3 w-3" />
            Editar
          </button>
        )}
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-400 space-y-0.5">
        {name && <p className="font-medium text-gray-900 dark:text-white">{name}</p>}
        {isBrazilianFormat ? (
          <>
            <p>{[displayStreet, displayNumber].filter(Boolean).join(', ')}</p>
            {displayComplement && <p>{displayComplement}</p>}
            {displayNeighborhood && <p>{displayNeighborhood}</p>}
            <p>{[displayCity, displayState].filter(Boolean).join(' - ')}{displayCep ? ` · CEP ${displayCep}` : ''}</p>
          </>
        ) : (
          <>
            {line1 && <p>{line1}</p>}
            {line2 && <p>{line2}</p>}
            <p>{[displayCity, displayState, postalCode].filter(Boolean).join(', ')}</p>
          </>
        )}
      </div>
    </div>
  );
}
