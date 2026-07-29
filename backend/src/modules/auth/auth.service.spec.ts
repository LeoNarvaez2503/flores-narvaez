import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { GoogleVerifierService } from './google-verifier.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../notifications/email.service';

describe('AuthService.googleLogin', () => {
  let service: AuthService;
  const prisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
  const verifier = { verify: jest.fn() };
  const jwt = { sign: jest.fn().mockReturnValue('signed.jwt') };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: GoogleVerifierService, useValue: verifier },
        { provide: JwtService, useValue: jwt },
        { provide: EmailService, useValue: { sendPasswordReset: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  it('crea el usuario si no existe y devuelve token', async () => {
    verifier.verify.mockResolvedValue({ email: 'neo@gmail.com', name: 'Neo', sub: 'g-1' });
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: 'u1', name: 'Neo', email: 'neo@gmail.com', role: 'CONSUMER', membershipTier: 'GRATUITO',
    });

    const res = await service.googleLogin('fake-token');

    expect(prisma.user.create).toHaveBeenCalled();
    expect(res.accessToken).toBe('signed.jwt');
    expect(res.user.email).toBe('neo@gmail.com');
  });

  it('reusa el usuario existente por email', async () => {
    verifier.verify.mockResolvedValue({ email: 'ana@example.com', name: 'Ana', sub: 'g-2' });
    prisma.user.findUnique.mockResolvedValue({
      id: 'u2', name: 'Ana', email: 'ana@example.com', role: 'CONSUMER', membershipTier: 'GRATUITO', googleId: null,
    });
    prisma.user.update.mockResolvedValue({});

    const res = await service.googleLogin('fake-token');

    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(res.user.id).toBe('u2');
  });
});
