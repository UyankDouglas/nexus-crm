import type { DownloadedFile } from '@/services/api-client';

/** Entrega ao navegador o arquivo gerado pela API, com o nome sugerido pelo servidor. */
export function saveFile({ blob, filename }: DownloadedFile): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.append(link);
  link.click();
  link.remove();
  // O download já começou; liberar a URL logo em seguida evita reter o arquivo na memória.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
