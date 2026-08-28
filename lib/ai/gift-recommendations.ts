import { normalizeCatalogSearchText } from '@/lib/catalog-search';

export type GiftProduct = {
  id: string; name: string; description?: string | null; category?: string;
  type?: string; base_price: number; sale_price: number | null; image_url: string | null;
  fulfillment_mode?: string;
  product_options?: Array<{ stock: number; price_modifier: number; active?: boolean }>;
};

export function giftSearchInput(messages: Array<{ role: string; content: string }>) {
  const text = normalizeCatalogSearchText(messages.filter(m => m.role === 'user').slice(-6).map(m => m.content).join(' '));
  let budget: number | null = null;
  for (let i = 0; i < messages.length; i++) {
    if (messages[i].role !== 'user') continue;
    const current = normalizeCatalogSearchText(messages[i].content);
    const budgets = [...current.matchAll(/(?:\bate\b|\borcamento(?:\s+de)?|r\$|\btenho\b)\s*(?:r\$\s*)?(\d+(?:[.,]\d{1,2})?)/g)];
    const explicit = budgets.at(-1)?.[1] ?? current.match(/\b(\d+(?:[.,]\d{1,2})?)\s+reais\b/)?.[1];
    const previous = messages[i - 1];
    const replyToBudget = previous?.role === 'assistant' && /orcamento|quanto.*gastar|faixa de (?:preco|valor)/.test(normalizeCatalogSearchText(previous.content));
    const bareReply = replyToBudget ? current.match(/^(\d+(?:[.,]\d{1,2})?)\s*[.!]?$/)?.[1] : null;
    if (explicit || bareReply) budget = Number((explicit || bareReply)!.replace(',', '.'));
  }
  const stop = new Set('quero gostaria encontrar produto produtos presente presentear para minha meu uma que com tem por reais ate orcamento tenho gosta de ela ele voce pode ajudar ajuda escolher nao sei dar algo pessoa anos aniversario amiga amigo mae pai namorada namorado quanto custa'.split(' '));
  const terms = [...new Set(text.replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(t => t.length > 2 && !stop.has(t)))].slice(-8);
  if (terms.includes('fofo') || terms.includes('fofa')) terms.push('criaturas');
  if (terms.includes('geek')) terms.push('articulado');
  return { terms: terms.slice(-8), budget: budget !== null && Number.isFinite(budget) && budget >= 0 ? budget : null };
}

export function availableGiftProducts(products: GiftProduct[], budget: number | null) {
  return products.filter(p => {
    if (p.type === 'digital' || p.category === 'encomenda') return false;
    const options = (p.product_options ?? []).filter(o => o.active !== false && (p.fulfillment_mode !== 'ready_stock' || o.stock > 0));
    if (p.fulfillment_mode === 'ready_stock' && !options.length) return false;
    const price = (p.sale_price ?? p.base_price) + (options.length ? Math.min(...options.map(o => o.price_modifier)) : 0);
    return Number.isFinite(price) && price >= 0 && (budget === null || price <= budget);
  });
}

export function resolveGiftRecommendations(value: unknown, candidates: GiftProduct[]) {
  if (!value || typeof value !== 'object') throw new Error('Resposta inválida');
  const data = value as { message?: unknown; product_ids?: unknown };
  if (typeof data.message !== 'string' || !data.message.trim() || !Array.isArray(data.product_ids) || data.product_ids.some(id => typeof id !== 'string')) throw new Error('Resposta inválida');
  const products = [...new Set(data.product_ids)].slice(0, 3).flatMap(id => {
    const p = candidates.find(c => c.id === id);
    if (!p) return [];
    const options = (p.product_options ?? []).filter(o => o.active !== false && (p.fulfillment_mode !== 'ready_stock' || o.stock > 0));
    const starting_price = (p.sale_price ?? p.base_price) + (options.length ? Math.min(...options.map(o => o.price_modifier)) : 0);
    return [{ id: p.id, name: p.name, type: 'physical', base_price: p.base_price, sale_price: p.sale_price, starting_price, image_url: p.image_url }];
  });
  return { message: data.message.replace(/https?:\/\/\S+/g, '').slice(0, 1500), products };
}
