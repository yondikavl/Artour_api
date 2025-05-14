import { type MiddlewareConsumer, Module, type NestModule, RequestMethod } from '@nestjs/common'
import { SummaryService } from './summary.service'
import { SummaryController } from './summary.controller'
import { UserAdminLoggedMiddleware } from '@/middlewares/auth.middleware'

@Module({
    controllers: [SummaryController],
    providers: [SummaryService]
})
export class SummaryModule implements NestModule {
    configure (consumer: MiddlewareConsumer): void {
        consumer.apply(UserAdminLoggedMiddleware).forRoutes(
            { path: '/summary/data-overview', method: RequestMethod.GET }
        )
    }
}
