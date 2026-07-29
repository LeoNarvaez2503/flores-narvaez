import { Type } from 'class-transformer';
import {
  IsDateString, IsEmail, IsIn, IsInt, IsLatitude, IsLongitude, IsNotEmpty,
  IsNumber, IsOptional, IsString, Max, Min, ValidateIf, ValidateNested,
} from 'class-validator';

export class CustomerDto {
  @IsNotEmpty() @IsString() name!: string;
  @IsEmail() email!: string;
  @IsOptional() @IsString() phone?: string;
}

export class CreateReservationDto {
  @IsNotEmpty() @IsString() wineId!: string;
  @IsNotEmpty() @IsString() establishmentId!: string;
  @IsInt() @Min(1) @Max(6) quantity!: number;
  @ValidateNested() @Type(() => CustomerDto) customer!: CustomerDto;
  @IsOptional() @IsDateString() pickupDate?: string;

  @IsIn(['pickup', 'delivery']) orderType!: 'pickup' | 'delivery';

  @ValidateIf((o) => o.orderType === 'delivery')
  @IsNotEmpty() @IsString() deliveryAddress?: string;

  @ValidateIf((o) => o.orderType === 'delivery')
  @IsNumber() @IsLatitude() deliveryLat?: number;

  @ValidateIf((o) => o.orderType === 'delivery')
  @IsNumber() @IsLongitude() deliveryLng?: number;
}
