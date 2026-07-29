import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListWinesQueryDto {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() grape?: string;
  @IsOptional() @Type(() => Number) @IsNumber() priceMin?: number;
  @IsOptional() @Type(() => Number) @IsNumber() priceMax?: number;
  @IsOptional() @IsIn(['relevancia', 'precio_asc', 'precio_desc', 'calificacion', 'nombre']) sort?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(60) pageSize?: number;
}
