import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query, Res } from '@nestjs/common'
import { PlaceService } from './place.service'
import { CreatePlaceDto } from './dto/create-place.dto'
import { type UserAuthenticated } from '@/middlewares/interfaces/AuthMiddleware'
import { EditPlaceDto } from './dto/edit-place.dto'
import { PlaceSearchService } from './place-search.service'
import { ArMapSearchPlaceDto } from './dto/ar-map-search-place.dto'
import { NearestSearchPlaceDto } from './dto/nearest-search-place.dto'
import { PlaceActionService } from './place-action.serrice'
import { MapSearchPlaceDto } from './dto/map-search-place.dto'
import prisma from '@/databases/prisma.db'

@Controller('places')
export class PlaceController {
    constructor (
        private readonly placeService: PlaceService,
        private readonly placeSearchService: PlaceSearchService,
        private readonly placeActionService: PlaceActionService
    ) {}

    @Post()
    async createPlace (
        @Body() dto: CreatePlaceDto,
        @Res({ passthrough: true }) res
    ): Promise<any> {
        const userAuthenticated: UserAuthenticated = res.locals.userAuthenticated
        const place = await this.placeService.createPlace(userAuthenticated.user.id, dto)
        return {
            data: place
        }
    }

    @Get()
    async getPlaces (
        @Query('filter') filter: string | undefined,
        @Query('keyword') keyword: string | undefined,
        @Query('limit') limit: string | undefined
    ): Promise<any> {
        const places = await this.placeService.getPlaces(filter, keyword, limit)
        return {
            data: places,
            meta: {
                total: await prisma.places.count(),
                limit: limit ? (parseInt(limit) || 500) : undefined
            }
        }
    }

    @Get('nearby-place')
    async getNearestPlacesByPlaceLocation (
        @Query('placeId') placeId: string | undefined
    ): Promise<any> {
        if (placeId === undefined) {
            throw new BadRequestException('Parameter placeId is required!')
        }
        const places = await this.placeSearchService.getNearestPlacesByPlaceLocation(placeId)
        return {
            data: places
        }
    }

    @Get('my-places')
    async getUserPlaces (
        @Res({ passthrough: true }) res
    ): Promise<any> {
        const userAuthenticated: UserAuthenticated = res.locals.userAuthenticated
        const places = await this.placeService.getUserPlaces(userAuthenticated.user.id)
        return {
            data: places
        }
    }

    @Get('highlight')
    async getHighlightPlaces (): Promise<any> {
        const places = await this.placeSearchService.getHighlightPlaces()
        return {
            data: places
        }
    }

    @Post('nearest')
    async getNearestPlaces (
        @Body() dto: NearestSearchPlaceDto
    ): Promise<any> {
        const places = await this.placeSearchService.getNearesetPlaces(dto)
        return {
            data: places
        }
    }

    @Get('bookmarks')
    async getUserBookmarks (
        @Res({ passthrough: true }) res
    ): Promise<any> {
        const userAuthenticated: UserAuthenticated = res.locals.userAuthenticated
        const placeBookmarks = await this.placeService.getUserBookmarks(userAuthenticated.user.id)
        return {
            data: placeBookmarks
        }
    }

    @Post('map-search')
    async getPlaceMapSearch (
        @Query('keyword') keyword: string | undefined,
        @Body() dto: MapSearchPlaceDto
    ): Promise<any> {
        if (keyword === undefined || keyword.trim() === '') throw new BadRequestException('Keyword not found!')
        const places = await this.placeSearchService.getPlacesByKeyword(keyword, dto)
        return {
            data: places
        }
    }

    @Post('ar-map-search')
    async getPlaceArMapSearch (
        @Body() dto: ArMapSearchPlaceDto
    ): Promise<any> {
        const places = await this.placeSearchService.getPlacesForArMap(dto)
        return {
            data: places
        }
    }

    @Get(':placeId/action-metadata')
    async getActionMetaData (
        @Param('placeId') placeId: string,
        @Res({ passthrough: true }) res
    ): Promise<any> {
        const userAuthenticated: UserAuthenticated = res.locals.userAuthenticated
        const metadata = await this.placeActionService.getPlaceActionMetaData(userAuthenticated.user.id, placeId)
        return {
            data: metadata
        }
    }

    @Post(':placeId/like')
    async likePlace (
        @Param('placeId') placeId: string,
        @Res({ passthrough: true }) res
    ): Promise<any> {
        const userAuthenticated: UserAuthenticated = res.locals.userAuthenticated
        await this.placeActionService.likePlace(userAuthenticated.user.id, placeId)
        return {
            message: 'ok'
        }
    }

    @Post(':placeId/dislike')
    async dislikePlace (
        @Param('placeId') placeId: string,
        @Res({ passthrough: true }) res
    ): Promise<any> {
        const userAuthenticated: UserAuthenticated = res.locals.userAuthenticated
        await this.placeActionService.dislikePlace(userAuthenticated.user.id, placeId)
        return {
            message: 'ok'
        }
    }

    @Post(':placeId/inc-views')
    @HttpCode(200)
    async incrementPlaceViewsCount (
        @Param('placeId') placeId: string
    ): Promise<any> {
        await this.placeActionService.incrementPlaceViewsCount(placeId)
        return {
            message: 'ok'
        }
    }

    @Post(':placeId/add-bookmarks')
    @HttpCode(200)
    async addPlaceToBookmarks (
        @Param('placeId') placeId: string,
        @Res({ passthrough: true }) res
    ): Promise<any> {
        const userAuthenticated: UserAuthenticated = res.locals.userAuthenticated
        await this.placeActionService.addPlaceToBookmarks(userAuthenticated.user.id, placeId)
        return {
            message: 'ok'
        }
    }

    @Get(':placeId')
    async getPlaceDetailById (
        @Param('placeId') placeId: string
    ): Promise<any> {
        const place = await this.placeService.getPlaceById(placeId)
        return {
            data: place
        }
    }

    @Get(':placeId/images')
    async getPlaceImages (
        @Param('placeId') placeId: string
    ): Promise<any> {
        const files = await this.placeService.getPlaceImages(placeId)
        return {
            data: files
        }
    }

    @Put(':placeId')
    async editUserPlace (
        @Param('placeId') placeId: string,
        @Body() dto: EditPlaceDto,
        @Res({ passthrough: true }) res
    ): Promise<any> {
        const userAuthenticated: UserAuthenticated = res.locals.userAuthenticated
        const place = await this.placeService.updatePlaceById(userAuthenticated.user, dto, placeId)
        return {
            data: place
        }
    }

    @Delete(':placeId')
    async deleteUserPlaces (
        @Param('placeId') placeId: string,
        @Res({ passthrough: true }) res
    ): Promise<any> {
        const userAuthenticated: UserAuthenticated = res.locals.userAuthenticated
        await this.placeService.deleteUserPlace(userAuthenticated.user.id, placeId)
        return {
            message: 'ok'
        }
    }
}
