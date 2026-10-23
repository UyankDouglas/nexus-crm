import { Injectable } from '@nestjs/common';
import type { ContactItem } from '@nexus/shared';
import type { TenantAuthContext } from '../../common/auth/auth-context';
import { AppException } from '../../common/errors/app.exception';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { toContactItem } from './customer.mapper';
import { CustomersService } from './customers.service';
import type { CreateContactDto, UpdateContactDto } from './dto/customer-request.dto';

/**
 * Contatos de um cliente. Quem pode ver e editar o cliente pode gerenciar seus contatos.
 * Cada cliente tem no máximo um contato principal; o primeiro contato já nasce principal.
 */
@Injectable()
export class ContactsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customers: CustomersService,
  ) {}

  async create(
    auth: TenantAuthContext,
    customerId: string,
    dto: CreateContactDto,
  ): Promise<ContactItem> {
    await this.customers.findInScope(auth, customerId);
    const organizationId = auth.organization.id;

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.contact.count({ where: { organizationId, customerId } });
      const isPrimary = existing === 0 || dto.isPrimary === true;
      if (isPrimary) {
        await tx.contact.updateMany({
          where: { organizationId, customerId, isPrimary: true },
          data: { isPrimary: false },
        });
      }

      const contact = await tx.contact.create({
        data: {
          organizationId,
          customerId,
          name: dto.name,
          email: dto.email ?? null,
          phone: dto.phone ?? null,
          position: dto.position ?? null,
          notes: dto.notes ?? null,
          isPrimary,
        },
      });
      await this.touchCustomer(tx, organizationId, customerId);
      return toContactItem(contact);
    });
  }

  async update(
    auth: TenantAuthContext,
    customerId: string,
    contactId: string,
    dto: UpdateContactDto,
  ): Promise<ContactItem> {
    await this.customers.findInScope(auth, customerId);
    const organizationId = auth.organization.id;
    const contact = await this.findContact(organizationId, customerId, contactId);

    return this.prisma.$transaction(async (tx) => {
      if (dto.isPrimary === true && !contact.isPrimary) {
        await tx.contact.updateMany({
          where: { organizationId, customerId, isPrimary: true },
          data: { isPrimary: false },
        });
      }
      // Um cliente com contatos sempre mantém um principal: não é possível apenas desmarcá-lo.
      const isPrimary = contact.isPrimary ? true : dto.isPrimary;

      const updated = await tx.contact.update({
        where: { id: contact.id },
        data: {
          name: dto.name,
          email: dto.email,
          phone: dto.phone,
          position: dto.position,
          notes: dto.notes,
          isPrimary,
        },
      });
      await this.touchCustomer(tx, organizationId, customerId);
      return toContactItem(updated);
    });
  }

  async remove(auth: TenantAuthContext, customerId: string, contactId: string): Promise<void> {
    await this.customers.findInScope(auth, customerId);
    const organizationId = auth.organization.id;
    const contact = await this.findContact(organizationId, customerId, contactId);

    await this.prisma.$transaction(async (tx) => {
      await tx.contact.delete({ where: { id: contact.id } });

      if (contact.isPrimary) {
        const next = await tx.contact.findFirst({
          where: { organizationId, customerId },
          orderBy: { createdAt: 'asc' },
          select: { id: true },
        });
        if (next) await tx.contact.update({ where: { id: next.id }, data: { isPrimary: true } });
      }
      await this.touchCustomer(tx, organizationId, customerId);
    });
  }

  /** O contato precisa pertencer ao cliente informado na rota e à organização ativa. */
  private async findContact(organizationId: string, customerId: string, contactId: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, customerId, organizationId },
      select: { id: true, isPrimary: true },
    });
    if (!contact) throw AppException.notFound('Contato não encontrado.');
    return contact;
  }

  /** Alterações nos contatos contam como atualização do cliente (ordenação por "atualizado"). */
  private async touchCustomer(
    tx: Prisma.TransactionClient,
    organizationId: string,
    customerId: string,
  ): Promise<void> {
    await tx.customer.update({
      where: { organizationId_id: { organizationId, id: customerId } },
      data: { updatedAt: new Date() },
    });
  }
}
