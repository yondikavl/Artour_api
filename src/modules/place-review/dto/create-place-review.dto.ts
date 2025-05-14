import { Transform } from 'class-transformer'
import { IsArray, IsNotEmpty, IsUUID, Max, Min } from 'class-validator'

export class CreatePlaceReviewDto {
    @IsNotEmpty()
    @Min(1)
    @Max(5)
        rating: number

    @IsNotEmpty()
    @Transform(({ value }) => value.trim())
        content: string

    @IsNotEmpty()
    @IsArray()
    @IsUUID('all', { each: true })
        imageIds: string[]
}
