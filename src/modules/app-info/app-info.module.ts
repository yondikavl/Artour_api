import { Module } from '@nestjs/common'
import { AppInfoService } from './app-info.service'
import { AppInfoController } from './app-info.controller'

@Module({
    controllers: [AppInfoController],
    providers: [AppInfoService]
})
export class AppInfoModule {}
