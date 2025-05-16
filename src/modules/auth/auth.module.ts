import { type MiddlewareConsumer, Module, type NestModule, RequestMethod } from '@nestjs/common'
import { AuthService } from './auth.service'
import { AuthController } from './auth.controller'
import { UserService } from '../user/user.service'
import { UserLoggedMiddleware } from '@/middlewares/auth.middleware'
import { FileService } from '../file/file.service'
import { PlaceReviewService } from '../place-review/place-review.service'
import { PlaceService } from '../place/place.service'
import { HttpModule } from '@nestjs/axios';

@Module({
    imports: [HttpModule],
    controllers: [AuthController],
    providers: [
        AuthService,
        UserService,
        FileService,
        PlaceService,
        PlaceReviewService
    ]
})
export class AuthModule implements NestModule {
    configure (consumer: MiddlewareConsumer): void {
        consumer.apply(UserLoggedMiddleware).forRoutes(
            { path: 'auth/my-session', method: RequestMethod.GET },
            { path: 'auth/logout', method: RequestMethod.DELETE }
        )
    }
}
