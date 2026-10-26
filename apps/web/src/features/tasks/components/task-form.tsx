import { zodResolver } from '@hookform/resolvers/zod';
import {
  type CustomerSummary,
  type DealSummary,
  TASK_LIMITS,
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  TASK_STATUSES,
  type TaskInput,
  type TaskItem,
  type TaskStatus,
  taskSchema,
} from '@nexus/shared';
import { useState } from 'react';
import { Controller, type Resolver, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { FormErrorAlert } from '@/components/form/form-error-alert';
import { FormTextField } from '@/components/form/form-text-field';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
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
import { CustomerCombobox } from '@/features/customers/components/customer-combobox';
import { useDeals } from '@/features/deals/hooks';
import { useOrganizationMembers } from '@/features/organization/hooks';
import { applyApiErrors } from '@/lib/form-errors';
import { todayIsoDate } from '@/lib/format';

const NONE = '__none__';

const formSchema = taskSchema.extend({ status: z.enum(TASK_STATUSES) });
export type TaskFormValues = TaskInput & { status: TaskStatus };

/** Valores do formulário em texto; o schema converte campos vazios. */
interface TaskFormFields {
  title: string;
  description: string;
  dueDate: string;
  priority: string;
  status: string;
  assigneeId: string;
  customerId: string;
  dealId: string;
}

const FIELD_NAMES: Array<keyof TaskFormFields> = [
  'title', 'description', 'dueDate', 'priority', 'status', 'assigneeId', 'customerId', 'dealId',
]; // prettier-ignore

interface TaskFormProps {
  /** Tarefa em edição; `null` para cadastro. */
  task: TaskItem | null;
  initialCustomer?: CustomerSummary | null;
  initialDeal?: DealSummary | null;
  onSubmit: (values: TaskFormValues) => Promise<unknown>;
  onCancel: () => void;
  submitLabel: string;
}

export function TaskForm({
  task,
  initialCustomer = null,
  initialDeal = null,
  onSubmit,
  onCancel,
  submitLabel,
}: TaskFormProps) {
  const me = useCurrentUser();
  const canAssign = usePermission('tasks:assign');
  const members = useOrganizationMembers();
  const [formError, setFormError] = useState<string | null>(null);
  const [customer, setCustomer] = useState<CustomerSummary | null>(
    task ? task.customer : initialCustomer,
  );
  const isEdit = task !== null;
  const currentDeal = task ? task.deal : initialDeal;

  const form = useForm<TaskFormFields, unknown, TaskFormValues>({
    resolver: zodResolver(formSchema) as unknown as Resolver<
      TaskFormFields,
      unknown,
      TaskFormValues
    >,
    defaultValues: {
      title: task?.title ?? '',
      description: task?.description ?? '',
      dueDate: task?.dueDate ?? todayIsoDate(),
      priority: task?.priority ?? 'MEDIUM',
      status: task?.status ?? 'TODO',
      assigneeId: task?.assignee.id ?? me.user.id,
      customerId: customer?.id ?? '',
      dealId: currentDeal?.id ?? '',
    },
  });

  const customerId = useWatch({ control: form.control, name: 'customerId' });
  const deals = useDeals(
    { customerId, status: 'OPEN', page: 1, pageSize: 50, sort: 'recent' },
    { enabled: Boolean(customerId) },
  );
  const dealOptions = deals.data?.data ?? [];
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
            label="Título"
            placeholder="Ex.: Enviar proposta revisada"
            maxLength={TASK_LIMITS.title}
            autoComplete="off"
            autoFocus={!isEdit}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormTextField control={form.control} name="dueDate" label="Prazo" type="date" />
            <Controller
              control={form.control}
              name="priority"
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="field-priority">Prioridade</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="field-priority" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[...TASK_PRIORITIES].reverse().map((priority) => (
                        <SelectItem key={priority} value={priority}>
                          {TASK_PRIORITY_LABELS[priority]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {canAssign ? (
              <Controller
                control={form.control}
                name="assigneeId"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="field-assigneeId">Responsável</FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="field-assigneeId" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {!activeMembers.some((member) => member.userId === field.value) && (
                          <SelectItem value={field.value}>
                            {task?.assignee.name ?? me.user.name}
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
                <FieldLabel htmlFor="task-assignee-readonly">Responsável</FieldLabel>
                <Input
                  id="task-assignee-readonly"
                  value={task ? task.assignee.name : `${me.user.name} (você)`}
                  readOnly
                  disabled
                />
              </Field>
            )}

            {isEdit && (
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
                        {TASK_STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {TASK_STATUS_LABELS[status]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />
            )}
          </div>

          <Controller
            control={form.control}
            name="customerId"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="field-customerId">Cliente (opcional)</FieldLabel>
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
                    {currentDeal &&
                      field.value === currentDeal.id &&
                      !dealOptions.some((deal) => deal.id === currentDeal.id) && (
                        <SelectItem value={currentDeal.id}>{currentDeal.title}</SelectItem>
                      )}
                    {dealOptions.map((deal) => (
                      <SelectItem key={deal.id} value={deal.id}>
                        {deal.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldState.invalid ? (
                  <FieldError errors={[fieldState.error]} />
                ) : (
                  <FieldDescription>
                    {customerId
                      ? 'Negócios em andamento do cliente selecionado.'
                      : 'Selecione um cliente para vincular um negócio.'}
                  </FieldDescription>
                )}
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="description"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="field-description">Descrição</FieldLabel>
                <Textarea
                  {...field}
                  id="field-description"
                  rows={4}
                  maxLength={TASK_LIMITS.description}
                  placeholder="O que precisa ser feito, combinados, materiais…"
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
