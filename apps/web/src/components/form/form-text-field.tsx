import type { ComponentProps, ReactNode } from 'react';
import { type Control, Controller, type FieldPath, type FieldValues } from 'react-hook-form';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { PasswordInput } from './password-input';

interface FormTextFieldProps<TValues extends FieldValues> extends Omit<
  ComponentProps<'input'>,
  'name' | 'defaultValue' | 'value' | 'onChange' | 'onBlur'
> {
  control: Control<TValues>;
  name: FieldPath<TValues>;
  label: string;
  description?: ReactNode;
  /** Campo de senha com botão para exibir/ocultar o valor. */
  password?: boolean;
}

/** Campo de texto integrado ao React Hook Form, com rótulo, descrição e erro acessíveis. */
export function FormTextField<TValues extends FieldValues>({
  control,
  name,
  label,
  description,
  password = false,
  id,
  ...inputProps
}: FormTextFieldProps<TValues>) {
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
