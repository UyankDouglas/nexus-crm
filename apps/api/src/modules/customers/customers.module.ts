import { Module } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';

@Module({
  controllers: [CustomersController],
  providers: [CustomersService, ContactsService],
  exports: [CustomersService],
})
export class CustomersModule {}
