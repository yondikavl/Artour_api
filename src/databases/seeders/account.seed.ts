import { hash } from 'bcryptjs'
import prisma from '../prisma.db'
import { UserRoleEnum } from '@prisma/client'

export default async (): Promise<void> => {
    console.log('account seeder....')

    /**
     * Create default user
     */
    await prisma.users.createMany({
        data: [
            {
                role: UserRoleEnum.ADMIN,
                name: 'Admin Seed 1',
                email: 'admin1@gmail.com',
                password: await hash('12345678', 10),
                active: true
            },
            {
                role: UserRoleEnum.ADMIN,
                name: 'Admin Seed 2',
                email: 'admin2@gmail.com',
                password: await hash('12345678', 10),
                active: true
            },
            {
                role: UserRoleEnum.USER,
                name: 'User Seed 1',
                email: 'user1@gmail.com',
                password: await hash('12345678', 10),
                active: true
            },
            {
                role: UserRoleEnum.USER,
                name: 'User Seed 2',
                email: 'user2@gmail.com',
                password: await hash('12345678', 10),
                active: true
            },
            {
                role: UserRoleEnum.ADMIN,
                name: 'Fanesa Hadi Pramana',
                email: 'fanesahadi@gmail.com',
                password: await hash('12345678', 10),
                active: true
            },
            {
                role: UserRoleEnum.ADMIN,
                name: 'Ilham Firman',
                email: 'ilhamfirman39@gmail.com',
                password: await hash('12345678', 10),
                active: true
            },
            {
                role: UserRoleEnum.ADMIN,
                name: 'Firman Ashari',
                email: 'firman.ashari@if.itera.ac.id',
                password: await hash('12345678', 10),
                active: true
            }
        ]
    })
}
