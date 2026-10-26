import { Module } from '@nestjs/common';
import { DealsController, PipelinesController } from './deals.controller';
import { DealsService } from './deals.service';
import { PipelineSettingsController } from './pipeline-settings.controller';
import { PipelineSettingsService } from './pipeline-settings.service';

@Module({
  controllers: [PipelinesController, PipelineSettingsController, DealsController],
  providers: [DealsService, PipelineSettingsService],
})
export class DealsModule {}
