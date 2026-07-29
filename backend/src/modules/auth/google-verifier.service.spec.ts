import { UnauthorizedException } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { GoogleVerifierService } from './google-verifier.service';

jest.mock('google-auth-library');

const MockedOAuth2Client = OAuth2Client as unknown as jest.Mock;

function buildService(verifyImpl: jest.Mock) {
  MockedOAuth2Client.mockImplementation(() => ({ verifyIdToken: verifyImpl }));
  const config = { get: jest.fn().mockReturnValue('test-client-id') } as any;
  return new GoogleVerifierService(config);
}

describe('GoogleVerifierService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('convierte un token inválido en 401 (UnauthorizedException)', async () => {
    const service = buildService(jest.fn().mockRejectedValue(new Error('Wrong number of segments')));
    await expect(service.verify('token-falso')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('devuelve email/name/sub cuando el token es válido', async () => {
    const getPayload = jest.fn().mockReturnValue({ email: 'x@gmail.com', name: 'X', sub: 'g-9' });
    const service = buildService(jest.fn().mockResolvedValue({ getPayload }));
    const res = await service.verify('token-bueno');
    expect(res).toEqual({ email: 'x@gmail.com', name: 'X', sub: 'g-9' });
  });
});
