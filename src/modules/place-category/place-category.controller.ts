import { BadRequestException, Body, Controller, Delete, Get, MethodNotAllowedException, Param, Post, Put, Query, UploadedFile, UseInterceptors } from '@nestjs/common'
import { CreatePlaceCategoryDto } from './dto/create-place-category.dto'
import { FileInterceptor } from '@nestjs/platform-express'
import { diskStorage } from 'multer'
import { generateMapMarkerFilename } from '@/helpers/file.helper'
import { PlaceCategoryService } from './place-category.service'
import { UpdatePlaceCategoryDto } from './dto/update-place-category.dto'

@Controller('place-categories')
export class PlaceCategoryController {
    constructor (private readonly placeCategoryService: PlaceCategoryService) {}

    @Post()
    @UseInterceptors(FileInterceptor('mapMarker', {
        storage: diskStorage({
            destination: './storages/map-markers',
            filename: (req, file, callback) => {
                const filename = generateMapMarkerFilename(file.originalname)
                callback(null, filename)
            }
        }),
        fileFilter: (req, file, callback) => {
            const allowImage = ['image/png']
            if (!allowImage.includes(file.mimetype)) {
                callback(new BadRequestException('File extension tidak diizinkan!'), false); return
            }
            callback(null, true)
        }
    }))
    async createPlaceCategory (
        @UploadedFile() mapMarker: Express.Multer.File,
        @Body() dto: CreatePlaceCategoryDto
    ): Promise<any> {
        const placeCategory = await this.placeCategoryService.createPlaceCategory(dto, mapMarker)
        return {
            data: placeCategory
        }
    }

    @Get()
    async getPlaceCategories (
        @Query('with-popular-place') withPopularPlaceString: string
    ): Promise<any> {
        const withPopularPlace: boolean = withPopularPlaceString === 'true'
        const placeCategories = await this.placeCategoryService.getPlaceCategories(withPopularPlace)
        return {
            data: placeCategories
        }
    }

    @Put(':placeCategoryId')
    @UseInterceptors(FileInterceptor('mapMarker', {
        storage: diskStorage({
            destination: './storages/map-markers',
            filename: (req, file, callback) => {
                const filename = generateMapMarkerFilename(file.originalname)
                callback(null, filename)
            }
        }),
        fileFilter: (req, file, callback) => {
            const allowImage = ['image/png']
            if (!allowImage.includes(file.mimetype)) {
                callback(new BadRequestException('File extension tidak diizinkan!'), false); return
            }
            callback(null, true)
        }
    }))
    async updatePlaceCategory (
        @Param('placeCategoryId') placeCategoryId: string,
        @UploadedFile() mapMarker: Express.Multer.File | undefined,
        @Body() dto: UpdatePlaceCategoryDto
    ): Promise<any> {
        await this.placeCategoryService.getPlaceCategoryById(placeCategoryId)
        const placeCategory = await this.placeCategoryService.updatePlaceCategory(placeCategoryId, mapMarker, dto)
        return {
            data: placeCategory
        }
    }

    @Delete(':placeCategoryId')
    async deletePlaceCategory (
        @Param('placeCategoryId') placeCategoryId: string
    ): Promise<any> {
        await this.placeCategoryService.getPlaceCategoryById(placeCategoryId)
        try {
            await this.placeCategoryService.deletePlaceCategory(placeCategoryId)
            return {
                message: 'ok'
            }
        } catch (error) {
            throw new MethodNotAllowedException('Operasi ini tidak diizinkan! Data kategori sedang digunakan.')
        }
    }
}
