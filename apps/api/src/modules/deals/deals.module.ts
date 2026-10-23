import { Module } from '@nestjs/common';
import { DealsController, PipelinesController } from './deals.controller';
import { DealsService } from './deals.service';

@Module({
  controllers: [PipelinesController, DealsController],
  providers: [DealsService],
})
export class DealsModule {}
