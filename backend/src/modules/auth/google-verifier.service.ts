import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';

@Injectable()
export class GoogleVerifierService {
  private readonly client: OAuth2Client;
  private readonly clientId?: string;

  constructor(config: ConfigService) {
    this.clientId = config.get<string>('googleClientId');
    this.client = new OAuth2Client(this.clientId);
  }

  async verify(idToken: string): Promise<{ email: string; name: string; sub: string }> {
    let payload;
    try {
      const ticket = await this.client.verifyIdToken({ idToken, audience: this.clientId });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Token de Google inválido.');
    }
    if (!payload || !payload.email) {
      throw new UnauthorizedException('Token de Google inválido.');
    }
    return {
      email: payload.email,
      name: payload.name ?? payload.email.split('@')[0],
      sub: payload.sub,
    };
  }
}
