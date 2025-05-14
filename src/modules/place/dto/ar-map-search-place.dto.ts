import { IsLatitude, IsLongitude, IsNotEmpty } from 'class-validator'

export class ArMapSearchPlaceDto {
    @IsNotEmpty()
    @IsLatitude()
        latitude: number

    @IsNotEmpty()
    @IsLongitude()
        longitude: number
}
