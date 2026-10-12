import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /** Also used as the hosting platform's health check, so it is not rate limited. */
  @Get()
  @SkipThrottle()
  getHello(): string {
    return this.appService.getHello();
  }
}
