import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class PayReservationDto {
  @IsString() @Matches(/^[\d\s]{13,25}$/, { message: 'Número de tarjeta inválido.' }) cardNumber!: string;
  @IsString() @Matches(/^\d{2}\/\d{2}$/, { message: 'Vencimiento inválido (MM/AA).' }) expiry!: string;
  @IsString() @Matches(/^\d{3,4}$/, { message: 'CVV inválido.' }) cvv!: string;
  @IsString() @IsNotEmpty() cardName!: string;
}
