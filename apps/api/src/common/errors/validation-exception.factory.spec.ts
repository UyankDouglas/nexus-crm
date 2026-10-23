import type { ValidationError } from 'class-validator';
import {
  flattenValidationErrors,
  validationExceptionFactory,
} from './validation-exception.factory';

describe('validationExceptionFactory', () => {
  const errors: ValidationError[] = [
    {
      property: 'email',
      constraints: { isEmail: 'Informe um e-mail válido.' },
      children: [],
    },
    {
      property: 'extra',
      constraints: { whitelistValidation: 'property extra should not exist' },
      children: [],
    },
    {
      property: 'address',
      children: [
        { property: 'city', constraints: { isString: 'Informe a cidade.' }, children: [] },
      ],
    },
  ];

  it('achata erros aninhados e traduz campos não permitidos', () => {
    expect(flattenValidationErrors(errors)).toEqual({
      email: ['Informe um e-mail válido.'],
      extra: ['Campo não permitido.'],
      'address.city': ['Informe a cidade.'],
    });
  });

  it('gera AppException com código VALIDATION_FAILED e status 400', () => {
    const exception = validationExceptionFactory(errors);
    expect(exception.getStatus()).toBe(400);
    expect(exception.code).toBe('VALIDATION_FAILED');
    expect(exception.fieldErrors).toHaveProperty('email');
  });
});
