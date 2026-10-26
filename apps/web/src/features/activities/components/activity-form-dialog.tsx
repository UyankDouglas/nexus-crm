import { zodResolver } from '@hookform/resolvers/zod';
import {
  ACTIVITY_LIMITS,
  ACTIVITY_TYPE_LABELS,
  ACTIVITY_TYPES,
  type ActivityInput,
  type ActivityItem,
  activitySchema,
  type CustomerSummary,
  type DealSummary,
} from '@nexus/shared';
import { Building2, Handshake } from 'lucide-react';
import { useState } from 'react';
import { Controller, type Resolver, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { FormErrorAlert } from '@/components/form/form-error-alert';
import { FormTextField } from '@/components/form/form-text-field';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { CustomerCombobox } from '@/features/customers/components/customer-combobox';
import { useDeals } from '@/features/deals/hooks';
import { applyApiErrors } from '@/lib/form-errors';
import { toDateTimeLocal } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useRetainedValue } from '@/hooks/use-retained-value';
import { useCreateActivity, useUpdateActivity } from '../hooks';
import { ACTIVITY_TYPE_ICONS } from '../activity-types';

const NONE = '__none__';

export type ActivityFormMode =
  | { kind: 'create'; customer?: CustomerSummary | null; deal?: DealSummary | null }
  | { kind: 'edit'; activity: ActivityItem }
  | null;

interface ActivityFormFields {
  type: string;
  subject: string;
  description: string;
  occurredAt: string;
  customerId: string;
  dealId: string;
}

const FIELD_NAMES: Array<keyof ActivityFormFields> = [
  'type', 'subject', 'description', 'occurredAt', 'customerId', 'dealId',
]; // prettier-ignore

export function ActivityFormDialog({
  mode: currentMode,
  onClose,
}: {
  mode: ActivityFormMode;
  onClose: () => void;
}) {
  // Durante a animação de fechamento, o formulário anterior continua visível.
  const mode = useRetainedValue(currentMode);
  return (
    <Dialog open={currentMode !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode?.kind === 'edit' ? 'Editar atividade' : 'Registrar atividade'}
          </DialogTitle>
          <DialogDescription>
            Registre ligações, reuniões, e-mails e observações no histórico do cliente.
          </DialogDescription>
        </DialogHeader>
        {mode && (
          <ActivityForm
            key={mode.kind === 'edit' ? mode.activity.id : 'create'}
            mode={mode}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ActivityForm({
  mode,
  onClose,
}: {
  mode: NonNullable<ActivityFormMode>;
  onClose: () => void;
}) {
  const create = useCreateActivity();
  const update = useUpdateActivity();
  const [formError, setFormError] = useState<string | null>(null);
  const editing = mode.kind === 'edit' ? mode.activity : null;
  const fixedCustomer = editing
    ? editing.customer
    : (mode.kind === 'create' && mode.customer) || null;
  const fixedDeal = editing ? editing.deal : (mode.kind === 'create' && mode.deal) || null;
  // Aberto a partir de um cliente ou negócio, o vínculo já está definido.
  const linksLocked = editing !== null || fixedCustomer !== null;
  const [customer, setCustomer] = useState<CustomerSummary | null>(fixedCustomer);

  const form = useForm<ActivityFormFields, unknown, ActivityInput>({
    resolver: zodResolver(activitySchema) as unknown as Resolver<
      ActivityFormFields,
      unknown,
      ActivityInput
    >,
    defaultValues: {
      type: editing?.type ?? 'CALL',
      subject: editing?.subject ?? '',
      description: editing?.description ?? '',
      occurredAt: toDateTimeLocal(editing?.occurredAt ?? new Date()),
      customerId: fixedCustomer?.id ?? '',
      dealId: fixedDeal?.id ?? '',
    },
  });

  const customerId = useWatch({ control: form.control, name: 'customerId' });
  const deals = useDeals(
    { customerId, page: 1, pageSize: 50, sort: 'recent' },
    { enabled: Boolean(customerId) && !linksLocked },
  );

  const submit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      if (editing) {
        const { customerId: _customer, dealId: _deal, ...changes } = values;
        await update.mutateAsync({ id: editing.id, input: changes });
        toast.success('Atividade atualizada.');
      } else {
        const created = await create.mutateAsync(values);
        toast.success(`${ACTIVITY_TYPE_LABELS[created.type]} registrada no histórico.`);
      }
      onClose();
    } catch (error) {
      setFormError(applyApiErrors(error, form.setError, FIELD_NAMES));
    }
  });

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <FieldGroup>
        <FormErrorAlert message={formError} />

        <Controller
          control={form.control}
          name="type"
          render={({ field }) => (
            <Field>
              <FieldLabel id="activity-type-label">Tipo</FieldLabel>
              <div
                role="radiogroup"
                aria-labelledby="activity-type-label"
                className="grid grid-cols-2 gap-2 sm:grid-cols-4"
              >
                {ACTIVITY_TYPES.map((type) => {
                  const Icon = ACTIVITY_TYPE_ICONS[type];
                  const selected = field.value === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => field.onChange(type)}
                      className={cn(
                        'flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-sm transition-colors hover:border-primary/40',
                        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                        selected && 'border-primary bg-primary/10 font-medium text-primary',
                      )}
                    >
                      <Icon className="size-4" aria-hidden="true" />
                      {ACTIVITY_TYPE_LABELS[type]}
                    </button>
                  );
                })}
              </div>
            </Field>
          )}
        />

        <FormTextField
          control={form.control}
          name="subject"
          label="Assunto"
          placeholder="Ex.: Alinhamento da proposta"
          maxLength={ACTIVITY_LIMITS.subject}
          autoComplete="off"
          autoFocus
        />

        <FormTextField
          control={form.control}
          name="occurredAt"
          label="Quando aconteceu"
          type="datetime-local"
          max={toDateTimeLocal(new Date())}
        />

        {linksLocked ? (
          <div className="flex flex-wrap gap-x-4 gap-y-1 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
            <span className="inline-flex items-center gap-1.5">
              <Building2 className="size-4 text-muted-foreground" aria-hidden="true" />
              {fixedCustomer?.name}
            </span>
            {fixedDeal && (
              <span className="inline-flex items-center gap-1.5">
                <Handshake className="size-4 text-muted-foreground" aria-hidden="true" />
                {fixedDeal.title}
              </span>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
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
                    onChange={(selected) => {
                      setCustomer(selected);
                      field.onChange(selected?.id ?? '');
                      form.setValue('dealId', '');
                    }}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="dealId"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="field-dealId">Negócio (opcional)</FieldLabel>
                  <Select
                    value={field.value || NONE}
                    onValueChange={(value) => field.onChange(value === NONE ? '' : value)}
                    disabled={!customerId}
                  >
                    <SelectTrigger id="field-dealId" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Nenhum negócio</SelectItem>
                      {(deals.data?.data ?? []).map((deal) => (
                        <SelectItem key={deal.id} value={deal.id}>
                          {deal.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </div>
        )}

        <Controller
          control={form.control}
          name="description"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="field-description">Detalhes</FieldLabel>
              <Textarea
                {...field}
                id="field-description"
                rows={4}
                maxLength={ACTIVITY_LIMITS.description}
                placeholder="O que foi conversado, decisões e próximos passos…"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Spinner />}
          {editing ? 'Salvar alterações' : 'Registrar'}
        </Button>
      </DialogFooter>
    </form>
  );
}
