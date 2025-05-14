import { Controller, Get } from '@nestjs/common'
import { SummaryService } from './summary.service'

@Controller('summary')
export class SummaryController {
    constructor (private readonly summaryService: SummaryService) {}

    @Get('data-overview')
    async getDataOverview (): Promise<any> {
        const dataOverview = await this.summaryService.getDataOverview()
        return {
            data: dataOverview
        }
    }
}
