import { Controller, Get } from '@nestjs/common'
import { AppInfoService } from './app-info.service'

@Controller('/')
export class AppInfoController {
    constructor (private readonly appInfoService: AppInfoService) {}

    @Get()
    getApiStatus (): any {
        return {
            message: 'Api server is ready.'
        }
    }
}
