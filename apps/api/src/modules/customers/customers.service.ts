import { HttpStatus, Injectable } from '@nestjs/common';
import {
  API_ERROR_CODES,
  CUSTOMER_STATUSES,
  documentLabel,
  isValidDocumentFor,
  normalizeDocument,
  onlyDigits,
  OWNER_FILTER_ME,
  OWNER_FILTER_NONE,
  type CustomerDetail,
  type CustomerListItem,
  type CustomerStats,
  type CustomerStatus,
  type CustomerType,
  type Paginated,
} from '@nexus/shared';
import type { TenantAuthContext } from '../../common/auth/auth-context';
import { AppException } from '../../common/errors/app.exception';
import { assertActiveMember } from '../../common/tenancy/members';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  customerDetailInclude,
  customerListInclude,
  toCustomerDetail,
  toCustomerListItem,
} from './customer.mapper';
import { canAssignCustomers, canViewAllCustomers, customerScope } from './customer-scope';
import type {
  CreateCustomerDto,
  ListCustomersQueryDto,
  UpdateCustomerDto,
} from './dto/customer-request.dto';

const MIN_DIGITS_FOR_NUMERIC_SEARCH = 3;
const MAX_TAG_SUGGESTIONS = 200;

const ORDER_BY: Record<ListCustomersQueryDto['sort'], Prisma.CustomerOrderByWithRelationInput[]> = {
  name: [{ name: 'asc' }, { id: 'asc' }],
  recent: [{ createdAt: 'desc' }, { id: 'desc' }],
  updated: [{ updatedAt: 'desc' }, { id: 'desc' }],
};

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    auth: TenantAuthContext,
    query: ListCustomersQueryDto,
  ): Promise<Paginated<CustomerListItem>> {
    const where: Prisma.CustomerWhereInput = {
      AND: [customerScope(auth), ...this.buildFilters(auth, query)],
    };

    const [total, customers] = await this.prisma.$transaction([
      this.prisma.customer.count({ where }),
      this.prisma.customer.findMany({
        where,
        include: customerListInclude,
        orderBy: ORDER_BY[query.sort],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    return {
      data: customers.map(toCustomerListItem),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  }

  async get(auth: TenantAuthContext, id: string): Promise<CustomerDetail> {
    const customer = await this.prisma.customer.findFirst({
      where: { AND: [customerScope(auth), { id }] },
      include: customerDetailInclude,
    });
    if (!customer) throw this.notFound();

    const linkedPeople =
      customer.type === 'COMPANY'
        ? await this.prisma.customer.findMany({
            where: { AND: [customerScope(auth), { companyId: customer.id }] },
            select: { id: true, name: true },
            orderBy: { name: 'asc' },
          })
        : [];

    return toCustomerDetail(customer, linkedPeople);
  }

  async create(auth: TenantAuthContext, dto: CreateCustomerDto): Promise<CustomerDetail> {
    this.assertValidDocument(dto.type, dto.document);
    const ownerId = await this.resolveOwnerForCreate(auth, dto.ownerId);
    if (dto.companyId) await this.assertLinkableCompany(auth, dto.type, dto.companyId);

    const customer = await this.runUniqueDocument(() =>
      this.prisma.customer.create({
        data: {
          organizationId: auth.organization.id,
          type: dto.type,
          name: dto.name,
          tradeName: dto.tradeName ?? null,
          document: dto.document ?? null,
          companyId: dto.companyId ?? null,
          email: dto.email ?? null,
          phone: dto.phone ?? null,
          website: dto.website ?? null,
          city: dto.city ?? null,
          state: dto.state ?? null,
          status: dto.status ?? 'LEAD',
          tags: dto.tags ?? [],
          notes: dto.notes ?? null,
          ownerId,
          createdById: auth.user.id,
        },
        select: { id: true },
      }),
    );

    return this.get(auth, customer.id);
  }

  async update(
    auth: TenantAuthContext,
    id: string,
    dto: UpdateCustomerDto,
  ): Promise<CustomerDetail> {
    const existing = await this.findInScope(auth, id);

    if (dto.document) this.assertValidDocument(existing.type, dto.document);
    if (dto.companyId) await this.assertLinkableCompany(auth, existing.type, dto.companyId, id);
    if (dto.ownerId !== undefined && dto.ownerId !== existing.ownerId) {
      await this.assertCanAssign(auth, dto.ownerId);
    }

    await this.runUniqueDocument(() =>
      this.prisma.customer.update({
        where: { organizationId_id: { organizationId: auth.organization.id, id } },
        data: {
          name: dto.name,
          tradeName: dto.tradeName,
          document: dto.document,
          companyId: dto.companyId,
          email: dto.email,
          phone: dto.phone,
          website: dto.website,
          city: dto.city,
          state: dto.state,
          status: dto.status,
          tags: dto.tags,
          notes: dto.notes,
          ownerId: dto.ownerId,
        },
      }),
    );

    return this.get(auth, id);
  }

  /**
   * Exclui o cliente (contatos em cascata) e desvincula as pessoas ligadas a ele. Clientes com
   * negócios não são excluídos, para não apagar o histórico comercial.
   */
  async remove(auth: TenantAuthContext, id: string): Promise<void> {
    await this.findInScope(auth, id);
    const organizationId = auth.organization.id;

    const deals = await this.prisma.deal.count({ where: { organizationId, customerId: id } });
    if (deals > 0) {
      throw new AppException(
        HttpStatus.CONFLICT,
        API_ERROR_CODES.CONFLICT,
        `Este cliente tem ${deals} ${deals === 1 ? 'negócio' : 'negócios'}. Exclua ou transfira os negócios antes de excluir o cliente.`,
      );
    }

    await this.prisma.$transaction([
      this.prisma.customer.updateMany({
        where: { organizationId, companyId: id },
        data: { companyId: null },
      }),
      this.prisma.customer.delete({ where: { organizationId_id: { organizationId, id } } }),
    ]);
  }

  /** Tags usadas nos clientes visíveis ao usuário, para filtros e sugestões. */
  async listTags(auth: TenantAuthContext): Promise<string[]> {
    const ownerFilter = canViewAllCustomers(auth)
      ? Prisma.empty
      : Prisma.sql`AND owner_id = ${auth.user.id}::uuid`;

    const rows = await this.prisma.$queryRaw<Array<{ tag: string }>>`
      SELECT DISTINCT unnest(tags) AS tag
      FROM customers
      WHERE organization_id = ${auth.organization.id}::uuid ${ownerFilter}
      ORDER BY tag
      LIMIT ${MAX_TAG_SUGGESTIONS}
    `;
    return rows.map((row) => row.tag);
  }

  async stats(auth: TenantAuthContext): Promise<CustomerStats> {
    const scope = customerScope(auth);
    const [groups, unassigned] = await this.prisma.$transaction([
      this.prisma.customer.groupBy({
        by: ['status'],
        where: scope,
        orderBy: { status: 'asc' },
        _count: { _all: true },
      }),
      this.prisma.customer.count({ where: { AND: [scope, { ownerId: null }] } }),
    ]);

    const byStatus = Object.fromEntries(CUSTOMER_STATUSES.map((status) => [status, 0])) as Record<
      CustomerStatus,
      number
    >;
    for (const group of groups) byStatus[group.status] = group._count._all;

    return {
      total: Object.values(byStatus).reduce((sum, value) => sum + value, 0),
      byStatus,
      unassigned,
    };
  }

  /** Busca um cliente dentro do escopo do usuário; fora dele, responde 404 (não revela existência). */
  async findInScope(auth: TenantAuthContext, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { AND: [customerScope(auth), { id }] },
      select: { id: true, type: true, ownerId: true },
    });
    if (!customer) throw this.notFound();
    return customer;
  }

  private buildFilters(
    auth: TenantAuthContext,
    query: ListCustomersQueryDto,
  ): Prisma.CustomerWhereInput[] {
    const filters: Prisma.CustomerWhereInput[] = [];

    if (query.search) {
      const term = query.search;
      const digits = onlyDigits(term);
      const document = normalizeDocument(term);
      const insensitive = (value: string) => ({ contains: value, mode: 'insensitive' as const });
      filters.push({
        OR: [
          { name: insensitive(term) },
          { tradeName: insensitive(term) },
          { email: insensitive(term) },
          ...(document.length >= MIN_DIGITS_FOR_NUMERIC_SEARCH
            ? [{ document: { contains: document } }]
            : []),
          ...(digits.length >= MIN_DIGITS_FOR_NUMERIC_SEARCH
            ? [{ phone: { contains: digits } }]
            : []),
        ],
      });
    }

    if (query.status) filters.push({ status: query.status });
    if (query.type) filters.push({ type: query.type });
    if (query.tag) filters.push({ tags: { hasEvery: [query.tag] } });

    if (query.owner === OWNER_FILTER_ME) filters.push({ ownerId: auth.user.id });
    else if (query.owner === OWNER_FILTER_NONE) filters.push({ ownerId: null });
    else if (query.owner) filters.push({ ownerId: query.owner });

    return filters;
  }

  /**
   * Responsável no cadastro: omitido → o próprio usuário. Definir outro responsável ou
   * deixar sem responsável exige `customers:assign` (gestores e administradores).
   */
  private async resolveOwnerForCreate(
    auth: TenantAuthContext,
    ownerId: string | null | undefined,
  ): Promise<string | null> {
    if (ownerId === undefined || ownerId === auth.user.id) return auth.user.id;
    await this.assertCanAssign(auth, ownerId);
    return ownerId;
  }

  private async assertCanAssign(auth: TenantAuthContext, ownerId: string | null): Promise<void> {
    if (!canAssignCustomers(auth)) {
      throw AppException.forbidden('Somente gestores e administradores podem distribuir clientes.');
    }
    if (ownerId !== null) await assertActiveMember(this.prisma, auth.organization.id, ownerId);
  }

  private async assertLinkableCompany(
    auth: TenantAuthContext,
    type: CustomerType,
    companyId: string,
    customerId?: string,
  ): Promise<void> {
    if (type !== 'PERSON') {
      throw AppException.validation({
        companyId: ['Apenas pessoas físicas podem ser vinculadas a uma empresa.'],
      });
    }
    const company = await this.prisma.customer.findFirst({
      where: { AND: [customerScope(auth), { id: companyId }] },
      select: { type: true },
    });
    if (!company || company.type !== 'COMPANY' || companyId === customerId) {
      throw AppException.validation({ companyId: ['Empresa não encontrada.'] });
    }
  }

  private assertValidDocument(type: CustomerType, document: string | null | undefined): void {
    if (document && !isValidDocumentFor(type, document)) {
      throw AppException.validation({
        document: [`Informe um ${documentLabel(type)} válido.`],
      });
    }
  }

  private async runUniqueDocument<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new AppException(
          HttpStatus.CONFLICT,
          API_ERROR_CODES.CONFLICT,
          'Já existe um cliente com este documento.',
          { document: ['Já existe um cliente com este CPF/CNPJ na organização.'] },
        );
      }
      throw error;
    }
  }

  private notFound(): AppException {
    return AppException.notFound('Cliente não encontrado.');
  }
}
