import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ProductEditorProvider, useProductEditor } from '../ProductEditorContext';
import { createInitialEditorState } from '../types/editor-state';
import { AIAssistantSection } from '../sections/AIAssistantSection';
function State() { const { state } = useProductEditor(); return <output data-testid="state">{JSON.stringify(state)}</output>; }
const fetchMock = vi.fn();
beforeEach(() => { vi.stubGlobal('fetch', fetchMock); fetchMock.mockResolvedValue({ ok: true, json: async () => ({ content: { title: 'Nome IA', description: 'Descrição IA', seo_title: 'SEO IA', seo_description: 'Meta IA', keywords: ['lula'], image_alts: [] }, imageUrls: [], calculation: null }) }); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks(); });
function setup() {
  render(<ProductEditorProvider initialState={createInitialEditorState('edit', { name: 'Nome manual', seoTitle: 'SEO manual', basePrice: 99 })}><AIAssistantSection /><State /></ProductEditorProvider>);
}
describe('AI editor review flow', () => {
  it('keeps manual fields until explicit application, fills only empty fields by default', async () => {
    setup(); fireEvent.click(screen.getByRole('button', { name: 'Gerar ficha com IA' }));
    await screen.findByRole('button', { name: 'Preencher campos vazios' });
    expect(JSON.parse(screen.getByTestId('state').textContent!).description).toBe('');
    fireEvent.click(screen.getByRole('button', { name: 'Preencher campos vazios' }));
    const state = JSON.parse(screen.getByTestId('state').textContent!);
    expect(state.name).toBe('Nome manual'); expect(state.seoTitle).toBe('SEO manual'); expect(state.basePrice).toBe(99); expect(state.description).toBe('Descrição IA');
  });
  it('requires explicit opt-in to overwrite manual copy', async () => {
    setup(); fireEvent.click(screen.getByRole('button', { name: 'Gerar ficha com IA' }));
    fireEvent.click(await screen.findByLabelText(/Substituir também/));
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar textos revisados' }));
    expect(JSON.parse(screen.getByTestId('state').textContent!).name).toBe('Nome IA');
  });
  it('preserves the form on provider failure', async () => {
    fetchMock.mockRejectedValueOnce(new Error('IA indisponível')); setup();
    fireEvent.click(screen.getByRole('button', { name: 'Gerar ficha com IA' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('IA indisponível'));
    expect(JSON.parse(screen.getByTestId('state').textContent!).name).toBe('Nome manual');
  });
});
