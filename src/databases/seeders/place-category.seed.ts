import * as fs from 'fs'
import * as path from 'path'
import prisma from '../prisma.db'

export default async (): Promise<void> => {
    console.log('place category seeder....')

    /**
     * Move default map markers to /storages/map-markers
     */
    const sourceDir = path.join(__dirname, 'assets', 'default-map-markers')
    const destinationDir = path.join(process.cwd(), 'storages', 'map-markers')
    const files = fs.readdirSync(path.join(__dirname, 'assets', 'default-map-markers'))
    if (!fs.existsSync(destinationDir)) fs.mkdirSync(destinationDir)
    for (const file of files) {
        fs.copyFileSync(path.join(sourceDir, file), path.join(destinationDir, file))
    }

    /**
     * Create default place category
     */
    await prisma.placeCategories.createMany({
        data: [
            {
                name: 'Wisata Pantai',
                description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
                mapMarker: 'map-marker-01.png'
            },
            {
                name: 'Wisata Kuliner',
                description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
                mapMarker: 'map-marker-02.png'
            },
            {
                name: 'Wisata Alam',
                description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
                mapMarker: 'map-marker-03.png'
            },
            {
                name: 'Wisata Religious',
                description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
                mapMarker: 'map-marker-04.png'
            },

            // More place category.
            {
                name: 'Uncategorized',
                description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
                mapMarker: 'map-marker-00.png'
            }
        ]
    })
}
