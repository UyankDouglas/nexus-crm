import type { ComponentProps, ReactNode } from 'react';
import { type Control, Controller, type FieldPath, type FieldValues } from 'react-hook-form';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { PasswordInput } from './password-input';

interface FormTextFieldProps<TValues extends FieldValues, TTransformed> extends Omit<
  ComponentProps<'input'>,
  'name' | 'defaultValue' | 'value' | 'onChange' | 'onBlur'
> {
  control: Control<TValues, unknown, TTransformed>;
  name: FieldPath<TValues>;
  label: string;
  description?: ReactNode;
  /** Campo de senha com botão para exibir/ocultar o valor. */
  password?: boolean;
  /** Formata o valor ao sair do campo (ex.: CPF/CNPJ, telefone). */
  formatOnBlur?: (value: string) => string;
}

/** Campo de texto integrado ao React Hook Form, com rótulo, descrição e erro acessíveis. */
export function FormTextField<TValues extends FieldValues, TTransformed = TValues>({
  control,
  name,
  label,
  description,
  password = false,
  formatOnBlur,
  id,
  ...inputProps
}: FormTextFieldProps<TValues, TTransformed>) {
  const inputId = id ?? `field-${name}`;
  const descriptionId = description ? `${inputId}-description` : undefined;

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const shared = {
          ...inputProps,
          ...field,
          value: (field.value as string | undefined) ?? '',
          id: inputId,
          'aria-invalid': fieldState.invalid,
          'aria-describedby': descriptionId,
          onBlur: () => {
            if (formatOnBlur && typeof field.value === 'string' && field.value.trim()) {
              field.onChange(formatOnBlur(field.value.trim()));
            }
            field.onBlur();
          },
        };

        return (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
            {password ? <PasswordInput {...shared} /> : <Input {...shared} />}
            {description && !fieldState.invalid && (
              <FieldDescription id={descriptionId}>{description}</FieldDescription>
            )}
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        );
      }}
    />
  );
}
