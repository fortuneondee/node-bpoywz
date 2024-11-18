export interface Bank {
  id: number;
  name: string;
  code: string;
}

export interface FormData {
  accountNumber: string;
  bankCode: string;
  amount: number;
  description?: string;
}