import { Module, Global } from '@nestjs/common';
import { DevConsoleService } from './dev-console.service';
import { LoggerService } from './logger.service';

@Global()
@Module({
  providers: [LoggerService, DevConsoleService],
  exports: [LoggerService, DevConsoleService],
})
export class LoggerModule {}
