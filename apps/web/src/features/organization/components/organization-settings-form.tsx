import { zodResolver } from '@hookform/resolvers/zod';
import { type OrganizationSummary, updateOrganizationSchema } from '@nexus/shared';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { FormErrorAlert } from '@/components/form/form-error-alert';
import { FormTextField } from '@/components/form/form-text-field';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { applyApiErrors } from '@/lib/form-errors';
import { useUpdateOrganization } from '../hooks';

export function OrganizationSettingsForm({
  summary,
  canEdit,
}: {
  summary: OrganizationSummary;
  canEdit: boolean;
}) {
  const update = useUpdateOrganization();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(updateOrganizationSchema),
    values: { name: summary.name },
  });

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    update.mutate(values, {
      onSuccess: () => toast.success('Dados da organização atualizados.'),
      onError: (error) => setFormError(applyApiErrors(error, form.setError, ['name'])),
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate aria-label="Dados da organização">
      <FieldGroup className="max-w-xl">
        <FormErrorAlert message={formError} />
        <FormTextField
          control={form.control}
          name="name"
          label="Nome da organização"
          autoComplete="organization"
          disabled={!canEdit}
          description={canEdit ? undefined : 'Somente administradores podem alterar este campo.'}
        />
        <Field>
          <FieldLabel htmlFor="organization-slug">Identificador</FieldLabel>
          <Input id="organization-slug" value={summary.slug} readOnly disabled />
          <FieldDescription>
            Gerado automaticamente no cadastro e não pode ser alterado.
          </FieldDescription>
        </Field>
        {canEdit && (
          <div>
            <Button type="submit" disabled={update.isPending || !form.formState.isDirty}>
              {update.isPending && <Spinner />}
              Salvar alterações
            </Button>
          </div>
        )}
      </FieldGroup>
    </form>
  );
}
