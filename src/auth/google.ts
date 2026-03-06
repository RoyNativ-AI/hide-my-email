import { OAuth2Client } from 'google-auth-library';
import { GoogleProfile } from '../types';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function verifyGoogleToken(token: string): Promise<GoogleProfile> {
  try {
    console.log('Verifying token with client ID:', process.env.GOOGLE_CLIENT_ID);
    
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    console.log('Token verified successfully, payload:', {
      sub: payload?.sub,
      email: payload?.email,
      name: payload?.name
    });
    
    if (!payload || !payload.sub || !payload.email) {
      throw new Error('Invalid token payload');
    }

    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name || '',
      picture: payload.picture || '',
    };
  } catch (error) {
    console.error('Google token verification failed:', error);
    throw new Error('Invalid Google token');
  }
}