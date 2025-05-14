import { Body, Controller, Delete, Get, Param, Post, Put, Query, Res } from '@nestjs/common'
import { PlaceReviewService } from './place-review.service'
import { CreatePlaceReviewDto } from './dto/create-place-review.dto'
import { type UserAuthenticated } from '@/middlewares/interfaces/AuthMiddleware'
import { UpdatePlaceReviewDto } from './dto/update-place-review.dto'
import prisma from '@/databases/prisma.db'

@Controller('place-reviews')
export class PlaceReviewController {
    constructor (private readonly placeReviewService: PlaceReviewService) {}

    @Post()
    async createPlaceReview (
        @Query('placeId') placeId: string,
        @Body() dto: CreatePlaceReviewDto,
        @Res({ passthrough: true }) res
    ): Promise<any> {
        const userAuthenticated: UserAuthenticated = res.locals.userAuthenticated
        const placeReview = await this.placeReviewService.createPlaceReview(userAuthenticated.user.id, placeId, dto)
        return {
            data: placeReview
        }
    }

    @Get()
    async getPlaceReviews (
        @Query('filter') filter: string | undefined,
        @Query('limit') limit: string | undefined,
        @Query('placeId') placeId: string | undefined
    ): Promise<any> {
        const placeReviews = await this.placeReviewService.getPlaceReviews(placeId, filter, limit)
        const totalPlaceReview = await prisma.placeReviews.count({ where: { placeId } })
        return {
            data: placeReviews,
            meta: {
                total: totalPlaceReview,
                limit: limit ? (parseInt(limit) || 500) : undefined
            }
        }
    }

    @Get('my-review')
    async getMyPlaceReview (
        @Query('placeId') placeId: string,
        @Res({ passthrough: true }) res
    ): Promise<any> {
        const userAuthenticated: UserAuthenticated = res.locals.userAuthenticated
        const placeReview = await this.placeReviewService.getMyPlaceReview(userAuthenticated.user.id, placeId)
        return {
            data: placeReview
        }
    }

    @Get('my-reviews')
    async getMyPlaceReviews (
        @Res({ passthrough: true }) res
    ): Promise<any> {
        const userAuthenticated: UserAuthenticated = res.locals.userAuthenticated
        const placeReviews = await this.placeReviewService.getMyPlaceReviews(userAuthenticated.user.id)
        return {
            data: placeReviews
        }
    }

    @Put(':placaReviewId')
    async updatePlaceReview (
        @Param('placaReviewId') placaReviewId: string,
        @Body() dto: UpdatePlaceReviewDto,
        @Res({ passthrough: true }) res
    ): Promise<any> {
        const userAuthenticated: UserAuthenticated = res.locals.userAuthenticated
        const placeReview = await this.placeReviewService.updatePlaceReview(userAuthenticated.user.id, placaReviewId, dto)
        return {
            data: placeReview
        }
    }

    @Delete(':placaReviewId')
    async deletePlaceReview (
        @Param('placaReviewId') placaReviewId: string,
        @Res({ passthrough: true }) res
    ): Promise<any> {
        const userAuthenticated: UserAuthenticated = res.locals.userAuthenticated
        await this.placeReviewService.deletePlaceReview(userAuthenticated.user.id, placaReviewId)
        return {
            message: 'ok'
        }
    }
}
