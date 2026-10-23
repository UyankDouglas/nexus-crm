import { type ContactItem, formatPhone } from '@nexus/shared';
import { Mail, MoreHorizontal, Pencil, Phone, Plus, Star, Trash2, UsersRound } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Spinner } from '@/components/ui/spinner';
import { getInitials } from '@/lib/format';
import { useDeleteContact, useSaveContact } from '../hooks';
import { type ContactDialogState, ContactFormDialog } from './contact-form-dialog';

export function ContactsCard({
  customerId,
  contacts,
}: {
  customerId: string;
  contacts: ContactItem[];
}) {
  const [dialog, setDialog] = useState<ContactDialogState>(null);
  const [pendingRemoval, setPendingRemoval] = useState<ContactItem | null>(null);
  const remove = useDeleteContact(customerId);
  const save = useSaveContact(customerId);

  const makePrimary = (contact: ContactItem) =>
    save.mutate(
      { contactId: contact.id, input: { isPrimary: true } },
      {
        onSuccess: () => toast.success(`${contact.name} agora é o contato principal.`),
        onError: (error) => toast.error(error.message),
      },
    );

  const confirmRemoval = () => {
    const contact = pendingRemoval;
    if (!contact) return;
    remove.mutate(contact.id, {
      onSuccess: () => {
        toast.success(`${contact.name} foi removido dos contatos.`);
        setPendingRemoval(null);
      },
      onError: (error) => toast.error(error.message),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contatos</CardTitle>
        <CardDescription>
          {contacts.length === 0
            ? 'Pessoas de referência neste cliente'
            : `${contacts.length} ${contacts.length === 1 ? 'contato' : 'contatos'}`}
        </CardDescription>
        {contacts.length > 0 && (
          <CardAction>
            <Button size="sm" variant="outline" onClick={() => setDialog({ contact: null })}>
              <Plus />
              Adicionar
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {contacts.length === 0 ? (
          <Empty className="border border-dashed py-8">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <UsersRound />
              </EmptyMedia>
              <EmptyTitle>Nenhum contato cadastrado</EmptyTitle>
              <EmptyDescription>
                Adicione as pessoas com quem a equipe conversa neste cliente.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button size="sm" onClick={() => setDialog({ contact: null })}>
                <Plus />
                Adicionar contato
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <ul className="divide-y">
            {contacts.map((contact) => (
              <li key={contact.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <Avatar className="size-9">
                  <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                    {getInitials(contact.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid min-w-0 flex-1 gap-0.5">
                  <p className="flex items-center gap-2 font-medium">
                    <span className="truncate">{contact.name}</span>
                    {contact.isPrimary && (
                      <Badge variant="outline" className="gap-1 border-warning/40 text-warning">
                        <Star className="size-3 fill-current" />
                        Principal
                      </Badge>
                    )}
                  </p>
                  {contact.position && (
                    <p className="text-sm text-muted-foreground">{contact.position}</p>
                  )}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    {contact.email && (
                      <a
                        href={`mailto:${contact.email}`}
                        className="flex items-center gap-1.5 text-primary hover:underline"
                      >
                        <Mail className="size-3.5" />
                        {contact.email}
                      </a>
                    )}
                    {contact.phone && (
                      <a
                        href={`tel:+55${contact.phone}`}
                        className="flex items-center gap-1.5 text-primary hover:underline"
                      >
                        <Phone className="size-3.5" />
                        {formatPhone(contact.phone)}
                      </a>
                    )}
                  </div>
                  {contact.notes && (
                    <p className="text-sm text-muted-foreground italic">{contact.notes}</p>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Ações para o contato ${contact.name}`}
                    >
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => setDialog({ contact })}>
                      <Pencil />
                      Editar
                    </DropdownMenuItem>
                    {!contact.isPrimary && (
                      <DropdownMenuItem onSelect={() => makePrimary(contact)}>
                        <Star />
                        Tornar principal
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => setPendingRemoval(contact)}
                    >
                      <Trash2 />
                      Remover
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <ContactFormDialog
        customerId={customerId}
        state={dialog}
        isFirstContact={contacts.length === 0}
        onClose={() => setDialog(null)}
      />
      <AlertDialog
        open={pendingRemoval !== null}
        onOpenChange={(open) => !open && setPendingRemoval(null)}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Remover {pendingRemoval?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              O contato será removido deste cliente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={remove.isPending}
              onClick={(event) => {
                event.preventDefault();
                confirmRemoval();
              }}
            >
              {remove.isPending && <Spinner />}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
