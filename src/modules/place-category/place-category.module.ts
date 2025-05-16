import { type MiddlewareConsumer, Module, type NestModule, RequestMethod } from '@nestjs/common'
import { PlaceCategoryService } from './place-category.service'
import { PlaceCategoryController } from './place-category.controller'
import { UserAdminLoggedMiddleware, UserLoggedMiddleware } from '@/middlewares/auth.middleware'
import { HttpModule } from '@nestjs/axios';

@Module({
    imports: [HttpModule],
    exports: [HttpModule],
    controllers: [PlaceCategoryController],
    providers: [PlaceCategoryService]
})
export class PlaceCategoryModule implements NestModule {
    configure (consumer: MiddlewareConsumer): void {
        consumer.apply(UserLoggedMiddleware).forRoutes(
            { path: '/place-categories', method: RequestMethod.GET }
        )
        consumer.apply(UserAdminLoggedMiddleware).forRoutes(
            { path: '/place-categories', method: RequestMethod.POST },
            { path: '/place-categories/:placeCategoryId', method: RequestMethod.PUT },
            { path: '/place-categories/:placeCategoryId', method: RequestMethod.DELETE }
        )
    }
}
