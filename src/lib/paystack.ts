declare const PaystackPop: any;

export const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;

export const initializePayment = (email: string, amount: number, onSuccess: (reference: string) => void) => {
  const handler = PaystackPop.setup({
    key: PAYSTACK_PUBLIC_KEY,
    email,
    amount: amount * 100, // Convert to kobo
    currency: 'NGN',
    callback: (response: { reference: string }) => {
      onSuccess(response.reference);
    },
    onClose: () => {
      console.log('Payment window closed');
    },
  });
  
  handler.openIframe();
};