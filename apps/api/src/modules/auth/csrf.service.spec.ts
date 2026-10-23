import type { AppConfigService } from '../../config/app-config.service';
import { CsrfService } from './csrf.service';

describe('CsrfService', () => {
  const config = { csrfSecret: 'segredo-de-teste-com-mais-de-32-caracteres' } as AppConfigService;
  const service = new CsrfService(config);

  it('gera tokens assinados e únicos', () => {
    const first = service.generate();
    const second = service.generate();

    expect(first).not.toBe(second);
    expect(first.split('.')).toHaveLength(2);
    expect(service.isValid(first)).toBe(true);
  });

  it('rejeita tokens adulterados ou assinados com outro segredo', () => {
    const token = service.generate();
    const [nonce] = token.split('.');
    const otherService = new CsrfService({
      csrfSecret: 'outro-segredo-de-teste-com-mais-de-32-chars',
    } as AppConfigService);

    expect(service.isValid(`${nonce}.assinatura-falsa`)).toBe(false);
    expect(service.isValid(otherService.generate())).toBe(false);
    expect(service.isValid('sem-ponto')).toBe(false);
    expect(service.isValid(undefined)).toBe(false);
  });

  it('exige que cabeçalho e cookie tenham o mesmo token válido', () => {
    const token = service.generate();

    expect(service.verify(token, token)).toBe(true);
    expect(service.verify(token, service.generate())).toBe(false);
    expect(service.verify(token, undefined)).toBe(false);
    expect(service.verify(undefined, token)).toBe(false);
  });
});
