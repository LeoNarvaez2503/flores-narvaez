import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { GoogleVerifierService } from './google-verifier.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../notifications/email.service';

describe('AuthService — recuperación de contraseña', () => {
  let service: AuthService;
  const prisma = { user: { findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn() } };
  const email = { sendPasswordReset: jest.fn().mockResolvedValue(true) };
  const config = { get: jest.fn().mockReturnValue('http://localhost:8081') };

  beforeEach(async () => {
    jest.clearAllMocks();
    email.sendPasswordReset.mockResolvedValue(true);
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: GoogleVerifierService, useValue: { verify: jest.fn() } },
        { provide: JwtService, useValue: { sign: jest.fn() } },
        { provide: EmailService, useValue: email },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  it('guarda un token y manda el correo si el usuario existe', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'ana@example.com', name: 'Ana' });
    prisma.user.update.mockResolvedValue({});
    const res = await service.forgotPassword('ana@example.com');
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ resetToken: expect.any(String) }),
    }));
    expect(email.sendPasswordReset).toHaveBeenCalledWith(expect.objectContaining({
      to: 'ana@example.com',
      resetUrl: expect.stringContaining('recover.html?token='),
    }));
    expect(res).toEqual({ ok: true });
  });

  it('responde ok aunque el correo no exista, sin mandar nada', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const res = await service.forgotPassword('nadie@example.com');
    expect(email.sendPasswordReset).not.toHaveBeenCalled();
    expect(res).toEqual({ ok: true });
  });

  it('cambia la contraseña con token vigente y limpia el token', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 'u1' });
    prisma.user.update.mockResolvedValue({});
    const res = await service.resetPassword('tok-1', 'nueva123');
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'u1' },
      data: expect.objectContaining({ resetToken: null, resetTokenExpiresAt: null }),
    }));
    expect(res).toEqual({ ok: true });
  });

  it('rechaza un token inválido o vencido', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    await expect(service.resetPassword('malo', 'nueva123')).rejects.toThrow('enlace');
  });
});
