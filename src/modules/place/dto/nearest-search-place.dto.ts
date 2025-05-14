import { IsLatitude, IsLongitude, IsNotEmpty } from 'class-validator'

export class NearestSearchPlaceDto {
    @IsNotEmpty()
    @IsLatitude()
        latitude: number

    @IsNotEmpty()
    @IsLongitude()
        longitude: number
}
