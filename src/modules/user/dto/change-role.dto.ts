import { IsEnum, IsNotEmpty } from 'class-validator'
import { UserRoleEnum } from '@prisma/client'

export class ChangeUserRoleDto {
    @IsNotEmpty()
    @IsEnum(UserRoleEnum)
        role: UserRoleEnum
}
