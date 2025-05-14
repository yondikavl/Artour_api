import { type MiddlewareConsumer, Module, type NestModule, RequestMethod } from '@nestjs/common'
import { FileService } from './file.service'
import { FileController } from './file.controller'
import { UserLoggedMiddleware } from '@/middlewares/auth.middleware'

@Module({
    controllers: [FileController],
    providers: [FileService]
})
export class FileModule implements NestModule {
    configure (consumer: MiddlewareConsumer): void {
        consumer.apply(UserLoggedMiddleware).forRoutes(
            { path: 'files/map-contents', method: RequestMethod.POST }
        )
    }
}
