import { type MiddlewareConsumer, Module, RequestMethod, type NestModule } from '@nestjs/common'
import { PlaceService } from './place.service'
import { PlaceController } from './place.controller'
import { FileService } from '../file/file.service'
import { UserAdminLoggedMiddleware, UserLoggedMiddleware } from '@/middlewares/auth.middleware'
import { PlaceSearchService } from './place-search.service'
import { PlaceActionService } from './place-action.serrice'

@Module({
    controllers: [PlaceController],
    providers: [
        PlaceService,
        PlaceSearchService,
        PlaceActionService,
        FileService
    ]
})
export class PlaceModule implements NestModule {
    configure (consumer: MiddlewareConsumer): void {
        consumer.apply(UserLoggedMiddleware).forRoutes(
            { path: '/places', method: RequestMethod.POST },
            { path: '/places/my-places', method: RequestMethod.GET },
            { path: '/places/bookmarks', method: RequestMethod.GET },
            { path: '/places/:placeId/images', method: RequestMethod.GET },
            { path: '/places/:placeId', method: RequestMethod.PUT },
            { path: '/places/:placeId', method: RequestMethod.DELETE },

            // For place search service.
            { path: '/places/highlight', method: RequestMethod.GET },
            { path: '/places/nearby-place', method: RequestMethod.GET },
            { path: '/places/nearest', method: RequestMethod.POST },
            { path: '/places/map-search', method: RequestMethod.GET },
            { path: '/places/ar-map-search', method: RequestMethod.POST },

            // For place action service.
            { path: '/places/:placeId/action-metadata', method: RequestMethod.GET },
            { path: '/places/:placeId/like', method: RequestMethod.POST },
            { path: '/places/:placeId/dislike', method: RequestMethod.POST },
            { path: '/places/:placeId/inc-views', method: RequestMethod.POST },
            { path: '/places/:placeId/add-bookmarks', method: RequestMethod.POST }
        )
        consumer.apply(UserAdminLoggedMiddleware).forRoutes(
            { path: '/places', method: RequestMethod.GET }
        )
    }
}
