import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import type {
  ContactItem,
  CustomerDetail,
  CustomerListItem,
  CustomerStats,
  Paginated,
} from '@nexus/shared';
import type { TenantAuthContext } from '../../common/auth/auth-context';
import { CurrentTenant, RequirePermissions } from '../../common/auth/auth.decorators';
import { uuidParam } from '../../common/pipes/uuid-param.pipe';
import { ContactsService } from './contacts.service';
import { CustomersService } from './customers.service';
import {
  CreateContactDto,
  CreateCustomerDto,
  ListCustomersQueryDto,
  UpdateContactDto,
  UpdateCustomerDto,
} from './dto/customer-request.dto';
import {
  ContactDto,
  CustomerDetailDto,
  CustomerStatsDto,
  PaginatedCustomersDto,
} from './dto/customer-response.dto';

const customerId = uuidParam('Cliente não encontrado.');
const contactId = uuidParam('Contato não encontrado.');

/**
 * Clientes da organização ativa. Vendedores só enxergam e alteram os clientes dos quais são
 * responsáveis; registros fora do escopo respondem 404.
 */
@ApiTags('Clientes')
@ApiCookieAuth('session')
@Controller('customers')
export class CustomersController {
  constructor(
    private readonly customers: CustomersService,
    private readonly contacts: ContactsService,
  ) {}

  @Get()
  @RequirePermissions('customers:read')
  @ApiOperation({ summary: 'Lista clientes com busca, filtros, ordenação e paginação' })
  @ApiOkResponse({ type: PaginatedCustomersDto })
  list(
    @CurrentTenant() auth: TenantAuthContext,
    @Query() query: ListCustomersQueryDto,
  ): Promise<Paginated<CustomerListItem>> {
    return this.customers.list(auth, query);
  }

  @Get('tags')
  @RequirePermissions('customers:read')
  @ApiOperation({ summary: 'Tags usadas nos clientes visíveis ao usuário' })
  @ApiOkResponse({ type: [String] })
  listTags(@CurrentTenant() auth: TenantAuthContext): Promise<string[]> {
    return this.customers.listTags(auth);
  }

  @Get('stats')
  @RequirePermissions('customers:read')
  @ApiOperation({ summary: 'Totais de clientes por status (respeitando o escopo do usuário)' })
  @ApiOkResponse({ type: CustomerStatsDto })
  stats(@CurrentTenant() auth: TenantAuthContext): Promise<CustomerStats> {
    return this.customers.stats(auth);
  }

  @Get(':customerId')
  @RequirePermissions('customers:read')
  @ApiOperation({ summary: 'Detalhes do cliente, contatos e pessoas vinculadas' })
  @ApiOkResponse({ type: CustomerDetailDto })
  @ApiNotFoundResponse({ description: 'Inexistente ou fora do escopo do usuário.' })
  get(
    @CurrentTenant() auth: TenantAuthContext,
    @Param('customerId', customerId) id: string,
  ): Promise<CustomerDetail> {
    return this.customers.get(auth, id);
  }

  @Post()
  @RequirePermissions('customers:create')
  @ApiSecurity('csrf')
  @ApiOperation({ summary: 'Cadastra um cliente' })
  @ApiCreatedResponse({ type: CustomerDetailDto })
  @ApiForbiddenResponse({
    description: 'Distribuir para outro responsável exige customers:assign.',
  })
  create(
    @CurrentTenant() auth: TenantAuthContext,
    @Body() dto: CreateCustomerDto,
  ): Promise<CustomerDetail> {
    return this.customers.create(auth, dto);
  }

  @Patch(':customerId')
  @RequirePermissions('customers:update')
  @ApiSecurity('csrf')
  @ApiOperation({ summary: 'Atualiza um cliente (parcial)' })
  @ApiOkResponse({ type: CustomerDetailDto })
  update(
    @CurrentTenant() auth: TenantAuthContext,
    @Param('customerId', customerId) id: string,
    @Body() dto: UpdateCustomerDto,
  ): Promise<CustomerDetail> {
    return this.customers.update(auth, id, dto);
  }

  @Delete(':customerId')
  @RequirePermissions('customers:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiSecurity('csrf')
  @ApiOperation({ summary: 'Exclui um cliente e seus contatos (gestores e administradores)' })
  @ApiNoContentResponse()
  remove(
    @CurrentTenant() auth: TenantAuthContext,
    @Param('customerId', customerId) id: string,
  ): Promise<void> {
    return this.customers.remove(auth, id);
  }

  @Post(':customerId/contacts')
  @RequirePermissions('customers:update')
  @ApiSecurity('csrf')
  @ApiTags('Contatos')
  @ApiOperation({ summary: 'Adiciona um contato ao cliente' })
  @ApiCreatedResponse({ type: ContactDto })
  createContact(
    @CurrentTenant() auth: TenantAuthContext,
    @Param('customerId', customerId) id: string,
    @Body() dto: CreateContactDto,
  ): Promise<ContactItem> {
    return this.contacts.create(auth, id, dto);
  }

  @Patch(':customerId/contacts/:contactId')
  @RequirePermissions('customers:update')
  @ApiSecurity('csrf')
  @ApiTags('Contatos')
  @ApiOperation({ summary: 'Atualiza um contato do cliente' })
  @ApiOkResponse({ type: ContactDto })
  updateContact(
    @CurrentTenant() auth: TenantAuthContext,
    @Param('customerId', customerId) id: string,
    @Param('contactId', contactId) contact: string,
    @Body() dto: UpdateContactDto,
  ): Promise<ContactItem> {
    return this.contacts.update(auth, id, contact, dto);
  }

  @Delete(':customerId/contacts/:contactId')
  @RequirePermissions('customers:update')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiSecurity('csrf')
  @ApiTags('Contatos')
  @ApiOperation({ summary: 'Remove um contato do cliente' })
  @ApiNoContentResponse()
  removeContact(
    @CurrentTenant() auth: TenantAuthContext,
    @Param('customerId', customerId) id: string,
    @Param('contactId', contactId) contact: string,
  ): Promise<void> {
    return this.contacts.remove(auth, id, contact);
  }
}
