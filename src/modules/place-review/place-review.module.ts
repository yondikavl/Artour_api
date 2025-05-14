import { type MiddlewareConsumer, Module, type NestModule, RequestMethod } from '@nestjs/common'
import { PlaceReviewService } from './place-review.service'
import { PlaceReviewController } from './place-review.controller'
import { UserLoggedMiddleware } from '@/middlewares/auth.middleware'
import { FileService } from '../file/file.service'

@Module({
    controllers: [PlaceReviewController],
    providers: [
        PlaceReviewService,
        FileService
    ]
})
export class PlaceReviewModule implements NestModule {
    configure (consumer: MiddlewareConsumer): void {
        consumer.apply(UserLoggedMiddleware).forRoutes(
            { path: '/place-reviews', method: RequestMethod.POST },
            { path: '/place-reviews', method: RequestMethod.GET },
            { path: '/place-reviews/my-reviews', method: RequestMethod.GET },
            { path: '/place-reviews/my-review', method: RequestMethod.GET },
            { path: '/place-reviews/:placaReviewId', method: RequestMethod.PUT },
            { path: '/place-reviews/:placaReviewId', method: RequestMethod.DELETE }
        )
    }
}
