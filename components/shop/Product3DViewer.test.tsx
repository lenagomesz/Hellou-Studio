import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Product3DViewer } from './Product3DViewer';

vi.mock('@google/model-viewer', () => ({}));

describe('Product3DViewer', () => {
  it('loads on demand, recolors without recreating the camera, restores original colors and provides rotation controls', async () => {
    const { container, rerender } = render(<Product3DViewer modelUrl="/tree.glb" productName="Papai Noel" color="#ff0000" />);
    expect(container.querySelector('model-viewer')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir visualização 3D' }));
    await waitFor(() => expect(container.querySelector('model-viewer')).not.toBeNull());
    const viewer = container.querySelector('model-viewer')!;
    const setColor = vi.fn();
    Object.assign(viewer, { model: { materials: [{ pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1], setBaseColorFactor: setColor } }] }, resetTurntableRotation: vi.fn(), jumpCameraToGoal: vi.fn() });
    fireEvent.load(viewer);
    expect(setColor).toHaveBeenLastCalledWith('#FF0000');
    rerender(<Product3DViewer modelUrl="/tree.glb" productName="Papai Noel" color="#00ff00" />);
    expect(container.querySelector('model-viewer')).toBe(viewer);
    expect(setColor).toHaveBeenLastCalledWith('#00FF00');
    fireEvent.click(screen.getByRole('button', { name: 'Girar automaticamente' }));
    expect(viewer).toHaveAttribute('auto-rotate');
    rerender(<Product3DViewer modelUrl="/tree.glb" productName="Papai Noel" />);
    expect(setColor).toHaveBeenLastCalledWith([1, 1, 1, 1]);
  });
  it('offers a retry after model failure', async () => {
    const { container } = render(<Product3DViewer modelUrl="/broken.glb" productName="Peça" />);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir visualização 3D' }));
    await waitFor(() => expect(container.querySelector('model-viewer')).not.toBeNull());
    const first = container.querySelector('model-viewer')!;
    fireEvent.error(first);
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    await waitFor(() => expect(container.querySelector('model-viewer')).not.toBe(first));
    expect(screen.getByRole('status')).toHaveTextContent('Carregando');
  });
});
