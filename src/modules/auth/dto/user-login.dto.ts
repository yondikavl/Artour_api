import { Transform } from 'class-transformer'
import { IsEmail, IsNotEmpty } from 'class-validator'

export class UserLoginDto {
    @IsEmail()
    @IsNotEmpty()
    @Transform(({ value }) => value.trim())
        email: string

    @IsNotEmpty()
    @Transform(({ value }) => value.trim())
        password: string
}
