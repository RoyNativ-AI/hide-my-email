export interface User {
  id: string;
  email: string;
  googleId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Alias {
  id: string;
  userId: string;
  localPart: string;
  domain: string;
  recipient: string;
  status: 'active' | 'inactive' | 'disabled';
  createdAt: Date;
  updatedAt: Date;
  lastUsed?: Date;
  emailCount: number;
}

export interface EmailLog {
  id: string;
  aliasId: string;
  fromAddress: string;
  toAddress: string;
  subject: string;
  forwardedAt: Date;
  status: 'forwarded' | 'blocked' | 'failed';
}

export interface CreateAliasRequest {
  description?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface GoogleProfile {
  id: string;
  email: string;
  name: string;
  picture: string;
}