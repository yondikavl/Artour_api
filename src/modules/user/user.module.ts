import { type MiddlewareConsumer, Module, type NestModule, RequestMethod } from '@nestjs/common'
import { UserService } from './user.service'
import { UserController } from './user.controller'
import { FileService } from '../file/file.service'
import { PlaceReviewService } from '../place-review/place-review.service'
import { UserAdminLoggedMiddleware, UserLoggedMiddleware } from '@/middlewares/auth.middleware'
import { PlaceService } from '../place/place.service'
import { HttpModule } from '@nestjs/axios';

@Module({
    imports: [HttpModule],
    controllers: [UserController],
    providers: [
        UserService,
        FileService,
        PlaceService,
        PlaceReviewService
    ]
})
export class UserModule implements NestModule {
    configure (consumer: MiddlewareConsumer): void {
        consumer.apply(UserLoggedMiddleware).forRoutes(
            { path: 'users/avatars', method: RequestMethod.POST },
            { path: 'users/info', method: RequestMethod.PATCH }
        )
        consumer.apply(UserAdminLoggedMiddleware).forRoutes(
            { path: 'users', method: RequestMethod.GET },
            { path: 'users/role', method: RequestMethod.PATCH },
            { path: 'users/:userId', method: RequestMethod.DELETE }
        )
    }
}
