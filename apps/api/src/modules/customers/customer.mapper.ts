import type { BrazilianState, ContactItem, CustomerDetail, CustomerListItem } from '@nexus/shared';
import type { Prisma } from '../../generated/prisma/client';

const userSummary = { select: { id: true, name: true } } as const;

/** Relações carregadas na listagem. */
export const customerListInclude = {
  ownerMembership: { select: { user: userSummary } },
  company: { select: { id: true, name: true } },
  _count: { select: { contacts: true } },
} satisfies Prisma.CustomerInclude;

/** Relações carregadas no detalhe (pessoas vinculadas são filtradas pelo escopo no service). */
export const customerDetailInclude = {
  ...customerListInclude,
  createdBy: userSummary,
  contacts: { orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }] },
} satisfies Prisma.CustomerInclude;

type CustomerWithList = Prisma.CustomerGetPayload<{ include: typeof customerListInclude }>;
type CustomerWithDetail = Prisma.CustomerGetPayload<{ include: typeof customerDetailInclude }>;
type ContactRecord = Prisma.ContactGetPayload<object>;

export function toContactItem(contact: ContactRecord): ContactItem {
  return {
    id: contact.id,
    name: contact.name,
    email: contact.email,
    phone: contact.phone,
    position: contact.position,
    isPrimary: contact.isPrimary,
    notes: contact.notes,
    createdAt: contact.createdAt.toISOString(),
    updatedAt: contact.updatedAt.toISOString(),
  };
}

export function toCustomerListItem(customer: CustomerWithList): CustomerListItem {
  return {
    id: customer.id,
    type: customer.type,
    name: customer.name,
    tradeName: customer.tradeName,
    document: customer.document,
    email: customer.email,
    phone: customer.phone,
    city: customer.city,
    state: customer.state as BrazilianState | null,
    status: customer.status,
    tags: customer.tags,
    owner: customer.ownerMembership?.user ?? null,
    company: customer.company,
    contactsCount: customer._count.contacts,
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString(),
  };
}

export function toCustomerDetail(
  customer: CustomerWithDetail,
  linkedPeople: CustomerDetail['linkedPeople'],
): CustomerDetail {
  return {
    ...toCustomerListItem(customer),
    website: customer.website,
    notes: customer.notes,
    createdBy: customer.createdBy,
    contacts: customer.contacts.map(toContactItem),
    linkedPeople,
  };
}
