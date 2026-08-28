import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AIHelpWidget } from './AIHelpWidget';
beforeEach(() => {
  window.sessionStorage.clear();
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks(); });
describe('gift chat widget', () => {
  it('keeps a single launcher at the right edge without the gift label', () => {
    render(<AIHelpWidget />);
    const launcher = screen.getByRole('button', { name: 'Abrir assistente virtual' });
    const wrapper = launcher.parentElement!;
    expect(wrapper).toHaveClass('right-4', 'flex', 'items-center', 'justify-end');
    expect(launcher).toHaveClass('shrink-0');
    expect(screen.queryByText('Não sabe o que presentear?')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });
  it('opens the conversation and restores the launcher when closed', () => {
    render(<AIHelpWidget />);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir assistente virtual' }));
    expect(screen.getByRole('dialog', { name: 'Assistente virtual da Hellou Studio' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Abrir assistente virtual' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Fechar conversa' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Abrir assistente virtual' })).toBeVisible();
  });
  it('offers normal catalog and human support when quota is exhausted', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, json: async () => ({ code: 'GEMINI_QUOTA_EXCEEDED', error: 'internal quota details' }) });
    vi.stubGlobal('fetch', fetchMock);
    render(<AIHelpWidget />);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir assistente virtual' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Sua mensagem' }), { target: { value: 'Quero um presente fofo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar mensagem' }));
    expect(await screen.findByText(/temporariamente pausado por limite de uso/)).toBeVisible();
    expect(screen.queryByText('internal quota details')).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
