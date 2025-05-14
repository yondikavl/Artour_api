import { type UserEntity } from '@/entities/user.entity'
import { type AccessTokenPayload } from '@/modules/auth/interfaces/Auth'

export interface UserAuthenticated {
    user: UserEntity
    tokenPayload: AccessTokenPayload
}
