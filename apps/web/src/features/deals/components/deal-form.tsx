import { zodResolver } from '@hookform/resolvers/zod';
import {
  DEAL_LIMITS,
  dealSchema,
  parseCurrency,
  type CustomerSummary,
  type DealDetail,
  type DealInput,
  type PipelineStageItem,
} from '@nexus/shared';
import { useState } from 'react';
import { Controller, type Resolver, useForm } from 'react-hook-form';
import { FormErrorAlert } from '@/components/form/form-error-alert';
import { FormTextField } from '@/components/form/form-text-field';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { useCurrentUser, usePermission } from '@/features/auth/hooks';
import { CustomerCombobox } from '@/features/customers/components/customer-combobox';
import { useOrganizationMembers } from '@/features/organization/hooks';
import { applyApiErrors } from '@/lib/form-errors';

const NONE = '__none__';
const numberFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Valores do formulário em texto; o schema converte valor, datas e campos vazios. */
interface DealFormFields {
  title: string;
  customerId: string;
  stageId: string;
  value: string;
  expectedCloseDate: string;
  ownerId: string;
  notes: string;
}

const FIELD_NAMES: Array<keyof DealFormFields> = [
  'title', 'customerId', 'stageId', 'value', 'expectedCloseDate', 'ownerId', 'notes',
]; // prettier-ignore

/** Etapas em andamento de um funil, oferecidas como etapa inicial no cadastro. */
export interface StageGroup {
  id: string;
  name: string;
  stages: PipelineStageItem[];
}

interface DealFormProps {
  /** Negócio em edição; `null` para cadastro. */
  deal: DealDetail | null;
  /** Funis com as etapas em andamento; o primeiro fornece a etapa inicial sugerida. */
  stageGroups: StageGroup[];
  initialCustomer?: CustomerSummary | null;
  initialStageId?: string;
  onSubmit: (values: DealInput) => Promise<unknown>;
  onCancel: () => void;
  submitLabel: string;
}

export function DealForm({
  deal,
  stageGroups,
  initialCustomer = null,
  initialStageId,
  onSubmit,
  onCancel,
  submitLabel,
}: DealFormProps) {
  const me = useCurrentUser();
  const canAssign = usePermission('deals:assign');
  const members = useOrganizationMembers();
  const [formError, setFormError] = useState<string | null>(null);
  const [customer, setCustomer] = useState<CustomerSummary | null>(
    deal?.customer ?? initialCustomer,
  );
  const isEdit = deal !== null;

  const form = useForm<DealFormFields, unknown, DealInput>({
    resolver: zodResolver(dealSchema) as unknown as Resolver<DealFormFields, unknown, DealInput>,
    defaultValues: {
      title: deal?.title ?? '',
      customerId: deal?.customer.id ?? initialCustomer?.id ?? '',
      stageId: initialStageId ?? stageGroups[0]?.stages[0]?.id ?? '',
      value: deal ? numberFormatter.format(deal.value) : '',
      expectedCloseDate: deal?.expectedCloseDate ?? '',
      ownerId: deal ? (deal.owner?.id ?? '') : me.user.id,
      notes: deal?.notes ?? '',
    },
  });

  const activeMembers = (members.data ?? []).filter((member) => member.status === 'ACTIVE');

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

          <FormTextField
            control={form.control}
            name="title"
            label="Nome do negócio"
            placeholder="Ex.: Renovação do contrato anual"
            maxLength={DEAL_LIMITS.title}
            autoComplete="off"
            autoFocus={!isEdit}
          />

          <Controller
            control={form.control}
            name="customerId"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="field-customerId">Cliente</FieldLabel>
                <CustomerCombobox
                  id="field-customerId"
                  value={customer}
                  invalid={fieldState.invalid}
                  clearable={false}
                  onChange={(selected) => {
                    setCustomer(selected);
                    field.onChange(selected?.id ?? '');
                  }}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              control={form.control}
              name="value"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="field-value">Valor potencial</FieldLabel>
                  <InputGroup>
                    <InputGroupAddon>R$</InputGroupAddon>
                    <InputGroupInput
                      {...field}
                      id="field-value"
                      inputMode="decimal"
                      placeholder="0,00"
                      aria-invalid={fieldState.invalid}
                      onBlur={() => {
                        const parsed = parseCurrency(field.value);
                        if (parsed !== null && parsed >= 0) {
                          field.onChange(numberFormatter.format(parsed));
                        }
                        field.onBlur();
                      }}
                    />
                  </InputGroup>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <FormTextField
              control={form.control}
              name="expectedCloseDate"
              label="Previsão de fechamento"
              type="date"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {isEdit ? (
              <Field>
                <FieldLabel htmlFor="deal-stage-readonly">Etapa</FieldLabel>
                <Input id="deal-stage-readonly" value={deal.stageName} readOnly disabled />
                <FieldDescription>Mude a etapa arrastando o card no quadro.</FieldDescription>
              </Field>
            ) : (
              <Controller
                control={form.control}
                name="stageId"
                render={({ field }) => {
                  const multiple = stageGroups.length > 1;
                  const selectedGroup = stageGroups.find((group) =>
                    group.stages.some((stage) => stage.id === field.value),
                  );
                  return (
                    <Field>
                      <FieldLabel htmlFor="field-stageId">Etapa inicial</FieldLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="field-stageId" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {stageGroups.map((group) => (
                            <SelectGroup key={group.id}>
                              {multiple && <SelectLabel>{group.name}</SelectLabel>}
                              {group.stages.map((stage) => (
                                <SelectItem key={stage.id} value={stage.id}>
                                  {stage.name}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          ))}
                        </SelectContent>
                      </Select>
                      {multiple && selectedGroup && (
                        <FieldDescription>Funil: {selectedGroup.name}</FieldDescription>
                      )}
                    </Field>
                  );
                }}
              />
            )}

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
                            <SelectItem value={field.value}>
                              {deal?.owner?.name ?? 'Responsável atual'}
                            </SelectItem>
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
                <FieldLabel htmlFor="deal-owner-readonly">Responsável</FieldLabel>
                <Input
                  id="deal-owner-readonly"
                  value={
                    isEdit ? (deal.owner?.name ?? 'Sem responsável') : `${me.user.name} (você)`
                  }
                  readOnly
                  disabled
                />
              </Field>
            )}
          </div>

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
                  maxLength={DEAL_LIMITS.notes}
                  placeholder="Contexto da negociação, próximos passos, decisores…"
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
