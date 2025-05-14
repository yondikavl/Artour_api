import { Transform } from 'class-transformer'
import { IsNotEmpty } from 'class-validator'

export class CreatePlaceCategoryDto {
    @IsNotEmpty()
    @Transform(({ value }) => value.trim())
        name: string

    @IsNotEmpty()
    @Transform(({ value }) => value.trim())
        description: string
}
