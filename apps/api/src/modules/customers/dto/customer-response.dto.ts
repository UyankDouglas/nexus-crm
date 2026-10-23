import { ApiProperty } from '@nestjs/swagger';
import {
  BRAZILIAN_STATES,
  CUSTOMER_STATUSES,
  CUSTOMER_TYPES,
  type BrazilianState,
  type ContactItem,
  type CustomerDetail,
  type CustomerListItem,
  type CustomerStats,
  type CustomerStatus,
  type CustomerSummary,
  type CustomerType,
  type PageMeta,
  type Paginated,
  type UserSummary,
} from '@nexus/shared';

class UserSummaryDto implements UserSummary {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() name: string;
}

class CustomerSummaryDto implements CustomerSummary {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() name: string;
}

export class ContactDto implements ContactItem {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() name: string;
  @ApiProperty({ nullable: true, type: String }) email: string | null;
  @ApiProperty({ nullable: true, type: String, description: 'Somente dígitos.' })
  phone: string | null;
  @ApiProperty({ nullable: true, type: String }) position: string | null;
  @ApiProperty() isPrimary: boolean;
  @ApiProperty({ nullable: true, type: String }) notes: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt: string;
  @ApiProperty({ format: 'date-time' }) updatedAt: string;
}

export class CustomerListItemDto implements CustomerListItem {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ enum: CUSTOMER_TYPES }) type: CustomerType;
  @ApiProperty() name: string;
  @ApiProperty({ nullable: true, type: String }) tradeName: string | null;
  @ApiProperty({ nullable: true, type: String, description: 'CPF/CNPJ sem pontuação.' })
  document: string | null;
  @ApiProperty({ nullable: true, type: String }) email: string | null;
  @ApiProperty({ nullable: true, type: String }) phone: string | null;
  @ApiProperty({ nullable: true, type: String }) city: string | null;
  @ApiProperty({ nullable: true, enum: BRAZILIAN_STATES }) state: BrazilianState | null;
  @ApiProperty({ enum: CUSTOMER_STATUSES }) status: CustomerStatus;
  @ApiProperty({ type: [String] }) tags: string[];
  @ApiProperty({ nullable: true, type: UserSummaryDto }) owner: UserSummaryDto | null;
  @ApiProperty({ nullable: true, type: CustomerSummaryDto }) company: CustomerSummaryDto | null;
  @ApiProperty() contactsCount: number;
  @ApiProperty({ format: 'date-time' }) createdAt: string;
  @ApiProperty({ format: 'date-time' }) updatedAt: string;
}

export class CustomerDetailDto extends CustomerListItemDto implements CustomerDetail {
  @ApiProperty({ nullable: true, type: String }) website: string | null;
  @ApiProperty({ nullable: true, type: String }) notes: string | null;
  @ApiProperty({ nullable: true, type: UserSummaryDto }) createdBy: UserSummaryDto | null;
  @ApiProperty({ type: [ContactDto] }) contacts: ContactDto[];
  @ApiProperty({ type: [CustomerSummaryDto] }) linkedPeople: CustomerSummaryDto[];
}

class PageMetaDto implements PageMeta {
  @ApiProperty() page: number;
  @ApiProperty() pageSize: number;
  @ApiProperty() total: number;
  @ApiProperty() totalPages: number;
}

export class PaginatedCustomersDto implements Paginated<CustomerListItem> {
  @ApiProperty({ type: [CustomerListItemDto] }) data: CustomerListItemDto[];
  @ApiProperty({ type: PageMetaDto }) meta: PageMetaDto;
}

class CustomersByStatusDto implements Record<CustomerStatus, number> {
  @ApiProperty() LEAD: number;
  @ApiProperty() ACTIVE: number;
  @ApiProperty() INACTIVE: number;
}

export class CustomerStatsDto implements CustomerStats {
  @ApiProperty() total: number;
  @ApiProperty({ type: CustomersByStatusDto }) byStatus: CustomersByStatusDto;
  @ApiProperty({ description: 'Clientes sem responsável comercial.' }) unassigned: number;
}
