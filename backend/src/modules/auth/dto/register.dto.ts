import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Ana Pérez' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: 'ana@example.com' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ example: '+58 412 1234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'secreta123', minLength: 6 })
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres.' })
  password!: string;
}
