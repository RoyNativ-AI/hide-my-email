export interface User {
  id: string;
  email: string;
  googleId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Alias {
  id: string;
  userId: string;
  localPart: string;
  domain: string;
  recipient: string;
  status: 'active' | 'inactive' | 'disabled';
  description?: string;
  createdAt: string;
  updatedAt: string;
  lastUsed?: string;
  emailCount: number;
  fullAddress: string;
}

export interface EmailLog {
  id: string;
  direction: 'inbound' | 'outbound';
  from: string;
  to: string;
  subject: string;
  bodyPreview?: string;
  status: 'delivered' | 'failed' | 'pending';
  timestamp: number;
  error?: string;
}

export interface CreateAliasRequest {
  description?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}