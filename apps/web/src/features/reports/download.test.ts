import { afterEach, describe, expect, it, vi } from 'vitest';
import { saveFile } from './download';

describe('saveFile', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('baixa o arquivo com o nome sugerido pela API e libera a URL temporária', () => {
    vi.useFakeTimers();
    const createObjectURL = vi.fn(() => 'blob:relatorio');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL }));
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const blob = new Blob(['a;b'], { type: 'text/csv' });

    saveFile({ blob, filename: 'nexus-crm-sellers-2026-09-27-a-2026-10-26.csv' });

    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(click).toHaveBeenCalledOnce();
    const link = click.mock.contexts[0] as HTMLAnchorElement;
    expect(link.download).toBe('nexus-crm-sellers-2026-09-27-a-2026-10-26.csv');
    expect(link.href).toBe('blob:relatorio');
    // O link temporário sai do documento logo após o clique.
    expect(document.querySelector('a[download]')).toBeNull();

    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:relatorio');
  });
});
