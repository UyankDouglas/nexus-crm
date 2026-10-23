import { zodResolver } from '@hookform/resolvers/zod';
import {
  CONTACT_LIMITS,
  contactSchema,
  formatPhone,
  type ContactInput,
  type ContactItem,
} from '@nexus/shared';
import { useState } from 'react';
import { Controller, type Resolver, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { FormErrorAlert } from '@/components/form/form-error-alert';
import { FormTextField } from '@/components/form/form-text-field';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { applyApiErrors } from '@/lib/form-errors';
import { useSaveContact } from '../hooks';

interface ContactFormFields {
  name: string;
  email: string;
  phone: string;
  position: string;
  isPrimary: boolean;
  notes: string;
}

export type ContactDialogState = { contact: ContactItem | null } | null;

interface ContactFormDialogProps {
  customerId: string;
  state: ContactDialogState;
  /** Primeiro contato do cliente: será o principal automaticamente. */
  isFirstContact: boolean;
  onClose: () => void;
}

export function ContactFormDialog({
  customerId,
  state,
  isFirstContact,
  onClose,
}: ContactFormDialogProps) {
  return (
    <Dialog open={state !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{state?.contact ? 'Editar contato' : 'Novo contato'}</DialogTitle>
          <DialogDescription>Pessoa de referência para falar com este cliente.</DialogDescription>
        </DialogHeader>
        {state && (
          <ContactForm
            key={state.contact?.id ?? 'novo'}
            customerId={customerId}
            contact={state.contact}
            isFirstContact={isFirstContact}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ContactForm({
  customerId,
  contact,
  isFirstContact,
  onClose,
}: {
  customerId: string;
  contact: ContactItem | null;
  isFirstContact: boolean;
  onClose: () => void;
}) {
  const save = useSaveContact(customerId);
  const [formError, setFormError] = useState<string | null>(null);
  const primaryLocked = isFirstContact || contact?.isPrimary === true;

  const form = useForm<ContactFormFields, unknown, ContactInput>({
    resolver: zodResolver(contactSchema) as unknown as Resolver<
      ContactFormFields,
      unknown,
      ContactInput
    >,
    defaultValues: {
      name: contact?.name ?? '',
      email: contact?.email ?? '',
      phone: contact?.phone ? formatPhone(contact.phone) : '',
      position: contact?.position ?? '',
      isPrimary: primaryLocked,
      notes: contact?.notes ?? '',
    },
  });

  const submit = form.handleSubmit(async (input) => {
    setFormError(null);
    try {
      await save.mutateAsync({ contactId: contact?.id, input });
      toast.success(contact ? 'Contato atualizado.' : 'Contato adicionado.');
      onClose();
    } catch (error) {
      setFormError(
        applyApiErrors(error, form.setError, ['name', 'email', 'phone', 'position', 'notes']),
      );
    }
  });

  return (
    <form onSubmit={submit} noValidate>
      <FieldGroup>
        <FormErrorAlert message={formError} />
        <FormTextField
          control={form.control}
          name="name"
          label="Nome"
          autoComplete="off"
          maxLength={CONTACT_LIMITS.name}
          autoFocus
        />
        <FormTextField
          control={form.control}
          name="position"
          label="Cargo"
          placeholder="Ex.: Gerente de compras"
          maxLength={CONTACT_LIMITS.position}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormTextField control={form.control} name="email" label="E-mail" type="email" />
          <FormTextField
            control={form.control}
            name="phone"
            label="Telefone"
            type="tel"
            formatOnBlur={formatPhone}
          />
        </div>
        <Controller
          control={form.control}
          name="notes"
          render={({ field }) => (
            <Field>
              <FieldLabel htmlFor="contact-notes">Observações</FieldLabel>
              <Textarea {...field} id="contact-notes" rows={2} maxLength={CONTACT_LIMITS.notes} />
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="isPrimary"
          render={({ field }) => (
            <Field orientation="horizontal">
              <Checkbox
                id="contact-primary"
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
                disabled={primaryLocked}
              />
              <div className="grid gap-1">
                <FieldLabel htmlFor="contact-primary">Contato principal</FieldLabel>
                {primaryLocked && (
                  <FieldDescription>
                    {isFirstContact
                      ? 'O primeiro contato é sempre o principal.'
                      : 'Para trocar, marque outro contato como principal.'}
                  </FieldDescription>
                )}
              </div>
            </Field>
          )}
        />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Spinner />}
            {contact ? 'Salvar' : 'Adicionar'}
          </Button>
        </DialogFooter>
      </FieldGroup>
    </form>
  );
}
