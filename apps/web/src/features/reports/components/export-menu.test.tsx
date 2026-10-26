import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePermission } from '@/features/auth/hooks';
import { reportService } from '@/services/reports.service';
import { saveFile } from '../download';
import { ExportMenu } from './export-menu';

vi.mock('@/features/auth/hooks', () => ({ usePermission: vi.fn() }));
vi.mock('@/services/reports.service', () => ({ reportService: { export: vi.fn() } }));
vi.mock('../download', () => ({ saveFile: vi.fn() }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const RANGE = { from: '2026-09-27', to: '2026-10-26' };

function renderMenu() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <ExportMenu type="closed-deals" range={RANGE} status="LOST" />
    </QueryClientProvider>,
  );
}

describe('ExportMenu', () => {
  beforeEach(() => {
    vi.mocked(reportService.export).mockReset();
    vi.mocked(saveFile).mockReset();
  });

  it('não aparece para quem não pode exportar', () => {
    vi.mocked(usePermission).mockReturnValue(false);
    renderMenu();

    expect(screen.queryByRole('button', { name: /Exportar/ })).not.toBeInTheDocument();
  });

  it('exporta em Excel com o período e o filtro atuais e entrega o arquivo', async () => {
    const user = userEvent.setup();
    vi.mocked(usePermission).mockReturnValue(true);
    const file = { blob: new Blob(['x']), filename: 'nexus-crm-closed-deals.xlsx' };
    vi.mocked(reportService.export).mockResolvedValue(file);
    renderMenu();

    await user.click(screen.getByRole('button', { name: 'Exportar Negócios ganhos e perdidos' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Excel (.xlsx)' }));

    expect(reportService.export).toHaveBeenCalledWith({
      ...RANGE,
      type: 'closed-deals',
      format: 'xlsx',
      status: 'LOST',
    });
    await vi.waitFor(() => expect(saveFile).toHaveBeenCalledWith(file));
  });
});
