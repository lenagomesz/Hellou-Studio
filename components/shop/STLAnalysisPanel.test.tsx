import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { STLAnalysisPanel } from './STLAnalysisPanel';
const fetchMock = vi.fn();
function makeFile() {
  const buffer = new ArrayBuffer(134), view = new DataView(buffer);
  view.setUint32(80, 1, true);
  [0,0,0,10,0,0,0,10,0].forEach((v, i) => view.setFloat32(96+i*4, v, true));
  const file = new File([buffer], 'private-model.stl');
  Object.defineProperty(file, 'arrayBuffer', { value: vi.fn().mockResolvedValue(buffer) });
  return file;
}
beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ message: 'Orientação de revisão.', aiGenerated: true }) });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks(); });
describe('local STL analysis', () => {
  it('shows dimensions without login or any network request', async () => {
    render(<STLAnalysisPanel file={makeFile()} authenticated={false} />);
    expect(await screen.findByText(/10 × 10 × 0/)).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: /Entre na sua conta/ })).toBeVisible();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'cm' } });
    expect(await screen.findByText(/100 × 100 × 0/)).toBeVisible();
  });
  it('posts only a small JSON summary, never the file or its name', async () => {
    render(<STLAnalysisPanel file={makeFile()} authenticated />);
    await screen.findByText('Orientação de revisão.');
    const options = fetchMock.mock.calls[0][1];
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(options.body)).toEqual({ format: 'binary', triangles: 1, dimensionsMm: [10,10,0], closedMesh: false, volumeCm3: null });
    expect(options.body).not.toContain('private-model');
  });
  it('keeps the geometry on network failure', async () => {
    fetchMock.mockRejectedValue(new Error('Sem conexão'));
    render(<STLAnalysisPanel file={makeFile()} authenticated />);
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Sem conexão'));
    expect(screen.getByText(/10 × 10 × 0/)).toBeVisible();
  });
  it('does not read or upload oversized files', async () => {
    const file = makeFile(); Object.defineProperty(file, 'size', { value: 4*1024*1024 });
    render(<STLAnalysisPanel file={file} authenticated />);
    await screen.findByRole('alert');
    expect(file.arrayBuffer).not.toHaveBeenCalled(); expect(fetchMock).not.toHaveBeenCalled();
  });
});
