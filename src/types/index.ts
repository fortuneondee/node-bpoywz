export interface User {
  id: string;
  email: string;
  username: string;
  balance: number;
  usdtBalance: number;
  role: 'user' | 'admin';
  status: 'active' | 'suspended';
  emailVerified: boolean;
  createdAt: Date;
  lastLoginAt?: Date;
}

export interface Transaction {
  id: string;
  type: 'deposit' | 'transfer' | 'usdt_deposit' | 'usdt_withdrawal';
  amount: number;
  usdtAmount?: number;
  senderId: string;
  recipientId?: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  reference?: string;
  createdAt: Date;
  updatedAt?: Date;
  approvedBy?: string;
  description: string;
  proofUrl?: string;
  remarks?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  details: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface SystemSettings {
  id: string;
  usdtRate: {
    buy: number;
    sell: number;
  };
  minDeposit: number;
  maxDeposit: number;
  minWithdrawal: number;
  maxWithdrawal: number;
  maintenanceMode: boolean;
  updatedAt: Date;
  updatedBy: string;
}