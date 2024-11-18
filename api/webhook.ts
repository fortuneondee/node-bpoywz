import { Request, Response } from 'express';
import { doc, getDoc, updateDoc, runTransaction } from 'firebase/firestore';
import { db } from '../src/lib/firebase';

// Verify Paystack webhook signature
const verifySignature = (payload: string, signature: string) => {
  const crypto = require('crypto');
  const secret = process.env.PAYSTACK_SECRET_KEY;
  const hash = crypto.createHmac('sha512', secret)
    .update(payload)
    .digest('hex');
  return hash === signature;
};

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const signature = req.headers['x-paystack-signature'];
  if (!signature || !verifySignature(JSON.stringify(req.body), signature)) {
    return res.status(401).json({ message: 'Invalid signature' });
  }

  const { event, data } = req.body;

  // Handle transfer.success or transfer.failed events
  if (event === 'transfer.success' || event === 'transfer.failed') {
    try {
      // Find transaction by Paystack reference
      const q = query(
        collection(db, 'transactions'),
        where('paystackReference', '==', data.reference)
      );
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return res.status(404).json({ message: 'Transaction not found' });
      }

      const transactionDoc = querySnapshot.docs[0];
      const transaction = transactionDoc.data();

      await runTransaction(db, async (dbTransaction) => {
        if (event === 'transfer.failed') {
          // Refund the amount to sender
          const senderRef = doc(db, 'users', transaction.senderId);
          dbTransaction.update(senderRef, {
            balance: increment(transaction.amount),
          });
        }

        // Update transaction status
        dbTransaction.update(doc(db, 'transactions', transactionDoc.id), {
          status: event === 'transfer.success' ? 'completed' : 'failed',
          updatedAt: serverTimestamp(),
        });
      });

      return res.status(200).json({ message: 'Webhook processed successfully' });
    } catch (error) {
      console.error('Webhook processing error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  return res.status(200).json({ message: 'Webhook received' });
}