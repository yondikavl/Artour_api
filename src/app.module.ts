import { join } from 'path'
import * as express from 'express'
import { ConfigModule } from '@nestjs/config'
import { type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common'
import { AuthModule } from './modules/auth/auth.module'
import { UserModule } from './modules/user/user.module'
import { APP_ROOT_PATH } from './constants/environments'
import { AppInfoModule } from './modules/app-info/app-info.module'
import { FileModule } from './modules/file/file.module'
import { PlaceModule } from './modules/place/place.module'
import { PlaceCategoryModule } from './modules/place-category/place-category.module'
import { PlaceReviewModule } from './modules/place-review/place-review.module'
import { SummaryModule } from './modules/summary/summary.module'
import { HttpModule } from '@nestjs/axios';

@Module({
    imports: [
        ConfigModule.forRoot({}),
        AppInfoModule,
        AuthModule,
        UserModule,
        FileModule,
        PlaceModule,
        PlaceCategoryModule,
        PlaceReviewModule,
        SummaryModule,
        HttpModule
    ],
    controllers: [
        //
    ],
    providers: [
        //
    ]
})
export class AppModule implements NestModule {
    configure (consumer: MiddlewareConsumer): void {
        consumer
            .apply(express.static(join(APP_ROOT_PATH, 'public')))
            .forRoutes('/')
        consumer
            .apply(express.static(join(APP_ROOT_PATH, 'storages/avatars')))
            .forRoutes('/avatars')
        consumer
            .apply(express.static(join(APP_ROOT_PATH, 'storages/map-contents'), {
                maxAge: '30d',
                cacheControl: true
            }))
            .forRoutes('/map-contents')
        consumer
            .apply(express.static(join(APP_ROOT_PATH, 'storages/map-markers')))
            .forRoutes('/map-markers')
    }
}
