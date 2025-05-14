import { IsNotEmpty } from 'class-validator'
import { Transform } from 'class-transformer'

export class ChangeInfoDto {
    @IsNotEmpty()
    @Transform(({ value }) => value.trim())
        name: string
}
