import { Transform, Type } from 'class-transformer'
import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID, IsUrl, ValidateNested } from 'class-validator'

class OpeningHoursDayDTO {
    @IsNotEmpty()
        dayIndex: number

    @IsBoolean()
        closed: boolean

    @IsBoolean()
        fullOpeningHours: boolean

    @IsNotEmpty()
        openingHours: string

    @IsNotEmpty()
        closingHours: string
}

export class CreatePlaceDto {
    @IsNotEmpty()
    @Transform(({ value }) => value.trim())
        name: string

    @IsNotEmpty()
    @Transform(({ value }) => value.trim())
        description: string

    @IsNotEmpty()
    @IsUUID()
    @Transform(({ value }) => value.trim())
        categoryId: string

    @IsNotEmpty()
    @IsArray()
    @IsUUID('all', { each: true })
        mapImageIds: string[]

    @IsNotEmpty()
        mapImageCoverId: string

    @IsNotEmpty()
        latitude: number

    @IsNotEmpty()
    @Transform(({ value }) => {
        if (value > 180) return value - 360
        if (value < -180) return value + 360
        return value
    })
        longitude: number

    @IsNotEmpty()
    @Transform(({ value }) => value.trim())
        address: string

    @IsNotEmpty()
    @IsArray()
    @ValidateNested()
    @Type(() => OpeningHoursDayDTO)
        openingHours: OpeningHoursDayDTO[]

    @IsOptional()
    @IsUrl({ require_protocol: true })
        website?: string

    @IsNotEmpty()
    @Transform(({ value }) => value.trim())
        phone: string

    @IsNotEmpty()
    @Transform(({ value }) => Number(value) || 0)
        price: number

    @IsArray()
    @IsString({ each: true })
        hashtags: string[]
}
