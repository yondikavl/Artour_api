import { IsLatitude, IsLongitude, IsNotEmpty } from 'class-validator'

export class MapSearchPlaceDto {
    @IsNotEmpty()
    @IsLatitude()
        latitude: number

    @IsNotEmpty()
    @IsLongitude()
        longitude: number
}
