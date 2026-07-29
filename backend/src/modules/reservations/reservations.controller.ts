import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { PayReservationDto } from './dto/pay-reservation.dto';

@ApiTags('reservations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly service: ReservationsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear una reserva (pendiente de pago) y devolver el desglose' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateReservationDto) {
    return this.service.createReservation(user.userId, dto);
  }

  @Post('preview')
  @ApiOperation({ summary: 'Calcular el desglose de una reserva sin crearla' })
  preview(@CurrentUser() user: AuthUser, @Body() dto: CreateReservationDto) {
    return this.service.previewReservation(user.userId, dto);
  }

  @Post(':id/pay')
  @ApiOperation({ summary: 'Pagar la seña (simulado), confirmar y enviar la factura por correo' })
  pay(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: PayReservationDto) {
    return this.service.payReservation(user.userId, id, dto);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancelar una reserva propia' })
  cancel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.cancelReservation(user.userId, id);
  }

  @Get('me')
  @ApiOperation({ summary: 'Mis reservas' })
  mine(@CurrentUser() user: AuthUser) {
    return this.service.listMine(user.userId);
  }
}
