import { zodResolver } from '@hookform/resolvers/zod';
import {
  BRAZILIAN_STATES,
  CUSTOMER_LIMITS,
  CUSTOMER_STATUS_LABELS,
  CUSTOMER_STATUSES,
  CUSTOMER_TYPE_LABELS,
  CUSTOMER_TYPES,
  customerSchema,
  type CustomerDetail,
  type CustomerInput,
  type CustomerStatus,
  type CustomerSummary,
  type CustomerType,
  documentLabel,
  formatDocument,
  formatPhone,
} from '@nexus/shared';
import { useState } from 'react';
import { Controller, type Resolver, useForm, useWatch } from 'react-hook-form';
import { FormErrorAlert } from '@/components/form/form-error-alert';
import { FormTextField } from '@/components/form/form-text-field';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { useCurrentUser, usePermission } from '@/features/auth/hooks';
import { useOrganizationMembers } from '@/features/organization/hooks';
import { applyApiErrors } from '@/lib/form-errors';
import { useCustomerTags } from '../hooks';
import { CustomerCombobox } from './customer-combobox';
import { TagInput } from './tag-input';

const NONE = '__none__';

/** Valores do formulário (texto vazio = campo não preenchido; o schema converte para `null`). */
export interface CustomerFormFields {
  type: CustomerType;
  name: string;
  tradeName: string;
  document: string;
  companyId: string;
  email: string;
  phone: string;
  website: string;
  city: string;
  state: string;
  status: CustomerStatus;
  ownerId: string;
  tags: string[];
  notes: string;
}

const FIELD_NAMES: Array<keyof CustomerFormFields> = [
  'type', 'name', 'tradeName', 'document', 'companyId', 'email', 'phone', 'website', 'city',
  'state', 'status', 'ownerId', 'tags', 'notes',
]; // prettier-ignore

function toFormValues(customer: CustomerDetail | null, currentUserId: string): CustomerFormFields {
  return {
    type: customer?.type ?? 'COMPANY',
    name: customer?.name ?? '',
    tradeName: customer?.tradeName ?? '',
    document: customer?.document ? formatDocument(customer.document) : '',
    companyId: customer?.company?.id ?? '',
    email: customer?.email ?? '',
    phone: customer?.phone ? formatPhone(customer.phone) : '',
    website: customer?.website ?? '',
    city: customer?.city ?? '',
    state: customer?.state ?? '',
    status: customer?.status ?? 'LEAD',
    ownerId: customer ? (customer.owner?.id ?? '') : currentUserId,
    tags: customer?.tags ?? [],
    notes: customer?.notes ?? '',
  };
}

interface CustomerFormProps {
  /** Cliente em edição; `null` para cadastro. */
  customer: CustomerDetail | null;
  onSubmit: (values: CustomerInput) => Promise<unknown>;
  onCancel: () => void;
  submitLabel: string;
}

export function CustomerForm({ customer, onSubmit, onCancel, submitLabel }: CustomerFormProps) {
  const me = useCurrentUser();
  const canAssign = usePermission('customers:assign');
  const members = useOrganizationMembers();
  const tags = useCustomerTags();
  const [formError, setFormError] = useState<string | null>(null);
  const [company, setCompany] = useState<CustomerSummary | null>(customer?.company ?? null);
  const isEdit = customer !== null;

  const form = useForm<CustomerFormFields, unknown, CustomerInput>({
    resolver: zodResolver(customerSchema) as unknown as Resolver<
      CustomerFormFields,
      unknown,
      CustomerInput
    >,
    defaultValues: toFormValues(customer, me.user.id),
  });
  const type = useWatch({ control: form.control, name: 'type' });
  const isCompany = type === 'COMPANY';

  const activeMembers = (members.data ?? []).filter((member) => member.status === 'ACTIVE');
  const ownerName = customer?.owner?.name ?? 'Sem responsável';

  const submit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      await onSubmit(values);
    } catch (error) {
      setFormError(applyApiErrors(error, form.setError, FIELD_NAMES));
    }
  });

  return (
    <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto px-6 py-5">
        <FieldGroup>
          <FormErrorAlert message={formError} />

          <Controller
            control={form.control}
            name="type"
            render={({ field }) => (
              <FieldSet>
                <FieldLegend variant="label">Tipo de cliente</FieldLegend>
                <RadioGroup
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value);
                    if (value === 'COMPANY') {
                      form.setValue('companyId', '');
                      setCompany(null);
                    } else {
                      form.setValue('tradeName', '');
                      form.setValue('website', '');
                    }
                  }}
                  disabled={isEdit}
                  className="grid grid-cols-2 gap-3"
                >
                  {CUSTOMER_TYPES.map((option) => (
                    <Label
                      key={option}
                      htmlFor={`customer-type-${option}`}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                    >
                      <RadioGroupItem value={option} id={`customer-type-${option}`} />
                      {CUSTOMER_TYPE_LABELS[option]}
                    </Label>
                  ))}
                </RadioGroup>
                {isEdit && (
                  <FieldDescription>O tipo não pode ser alterado após o cadastro.</FieldDescription>
                )}
              </FieldSet>
            )}
          />

          <FormTextField
            control={form.control}
            name="name"
            label={isCompany ? 'Razão social' : 'Nome completo'}
            autoComplete="off"
            maxLength={CUSTOMER_LIMITS.name}
            autoFocus={!isEdit}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            {isCompany && (
              <FormTextField
                control={form.control}
                name="tradeName"
                label="Nome fantasia"
                autoComplete="off"
                maxLength={CUSTOMER_LIMITS.tradeName}
              />
            )}
            <FormTextField
              control={form.control}
              name="document"
              label={documentLabel(type)}
              placeholder={isCompany ? '00.000.000/0000-00' : '000.000.000-00'}
              autoComplete="off"
              maxLength={18}
              formatOnBlur={formatDocument}
              description={isCompany ? 'Aceita o novo CNPJ alfanumérico.' : undefined}
            />
          </div>

          {!isCompany && (
            <Controller
              control={form.control}
              name="companyId"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="field-companyId">Empresa vinculada</FieldLabel>
                  <CustomerCombobox
                    id="field-companyId"
                    type="COMPANY"
                    placeholder="Selecione uma empresa"
                    value={company}
                    invalid={fieldState.invalid}
                    onChange={(selected) => {
                      setCompany(selected);
                      field.onChange(selected?.id ?? '');
                    }}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          )}

          <FieldSeparator>Contato</FieldSeparator>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormTextField
              control={form.control}
              name="email"
              label="E-mail"
              type="email"
              autoComplete="off"
              maxLength={CUSTOMER_LIMITS.email}
            />
            <FormTextField
              control={form.control}
              name="phone"
              label="Telefone"
              type="tel"
              placeholder="(11) 98765-4321"
              autoComplete="off"
              formatOnBlur={formatPhone}
            />
          </div>

          {isCompany && (
            <FormTextField
              control={form.control}
              name="website"
              label="Site"
              type="url"
              placeholder="https://"
              maxLength={CUSTOMER_LIMITS.website}
            />
          )}

          <div className="grid grid-cols-[1fr_7rem] gap-4">
            <FormTextField
              control={form.control}
              name="city"
              label="Cidade"
              autoComplete="off"
              maxLength={CUSTOMER_LIMITS.city}
            />
            <Controller
              control={form.control}
              name="state"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="field-state">UF</FieldLabel>
                  <Select
                    value={field.value || NONE}
                    onValueChange={(value) => field.onChange(value === NONE ? '' : value)}
                  >
                    <SelectTrigger id="field-state" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>—</SelectItem>
                      {BRAZILIAN_STATES.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </div>

          <FieldSeparator>Gestão comercial</FieldSeparator>

          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              control={form.control}
              name="status"
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="field-status">Status</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="field-status" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CUSTOMER_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {CUSTOMER_STATUS_LABELS[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />

            {canAssign ? (
              <Controller
                control={form.control}
                name="ownerId"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="field-ownerId">Responsável</FieldLabel>
                    <Select
                      value={field.value || NONE}
                      onValueChange={(value) => field.onChange(value === NONE ? '' : value)}
                    >
                      <SelectTrigger id="field-ownerId" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>Sem responsável</SelectItem>
                        {field.value &&
                          !activeMembers.some((member) => member.userId === field.value) && (
                            <SelectItem value={field.value}>{ownerName}</SelectItem>
                          )}
                        {activeMembers.map((member) => (
                          <SelectItem key={member.userId} value={member.userId}>
                            {member.name}
                            {member.userId === me.user.id && ' (você)'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            ) : (
              <Field>
                <FieldLabel htmlFor="field-ownerId-readonly">Responsável</FieldLabel>
                <Input
                  id="field-ownerId-readonly"
                  value={isEdit ? ownerName : `${me.user.name} (você)`}
                  readOnly
                  disabled
                />
                <FieldDescription>Somente a gestão redistribui clientes.</FieldDescription>
              </Field>
            )}
          </div>

          <Controller
            control={form.control}
            name="tags"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="field-tags">Tags</FieldLabel>
                <TagInput
                  id="field-tags"
                  value={field.value}
                  onChange={field.onChange}
                  suggestions={tags.data}
                  invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="notes"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="field-notes">Observações</FieldLabel>
                <Textarea
                  {...field}
                  id="field-notes"
                  rows={4}
                  maxLength={CUSTOMER_LIMITS.notes}
                  aria-invalid={fieldState.invalid}
                  placeholder="Preferências, histórico relevante, próximos passos…"
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </FieldGroup>
      </div>

      <div className="flex justify-end gap-2 border-t bg-background px-6 py-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Spinner />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
