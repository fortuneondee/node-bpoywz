import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { VirtualCard as VirtualCardType } from '../types';
import { CreditCard, Eye, EyeOff, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function VirtualCard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCardDetails, setShowCardDetails] = useState(false);
  const [card, setCard] = useState<VirtualCardType | null>(null);

  useEffect(() => {
    loadCard();
  }, [user]);

  const loadCard = async () => {
    if (!user) return;
    
    try {
      const cardDoc = await getDoc(doc(db, 'users', user.id, 'virtualCards', 'primary'));
      if (cardDoc.exists()) {
        setCard({ id: cardDoc.id, ...cardDoc.data() } as VirtualCardType);
      }
    } catch (error) {
      console.error('Error loading card:', error);
      toast.error('Failed to load card details');
    } finally {
      setLoading(false);
    }
  };

  const createVirtualCard = async () => {
    if (!user || creating) return;

    setCreating(true);
    try {
      // Generate card details
      const cardNumber = '4' + Array(15).fill(0).map(() => Math.floor(Math.random() * 10)).join('');
      const expiryMonth = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
      const expiryYear = String(new Date().getFullYear() + 3).slice(-2);
      const cvv = Array(3).fill(0).map(() => Math.floor(Math.random() * 10)).join('');

      const cardData: Omit<VirtualCardType, 'id'> = {
        userId: user.id,
        cardNumber,
        expiryMonth,
        expiryYear,
        cvv,
        balance: 0,
        status: 'active',
        createdAt: new Date(),
      };

      await setDoc(doc(db, 'users', user.id, 'virtualCards', 'primary'), cardData);
      setCard({ id: 'primary', ...cardData });
      toast.success('Virtual card created successfully!');
    } catch (error) {
      console.error('Error creating card:', error);
      toast.error('Failed to create virtual card');
    } finally {
      setCreating(false);
    }
  };

  const toggleCardStatus = async () => {
    if (!user || !card) return;

    try {
      const newStatus = card.status === 'active' ? 'frozen' : 'active';
      await updateDoc(doc(db, 'users', user.id, 'virtualCards', 'primary'), {
        status: newStatus
      });
      setCard({ ...card, status: newStatus });
      toast.success(`Card ${newStatus === 'active' ? 'activated' : 'frozen'} successfully`);
    } catch (error) {
      console.error('Error updating card status:', error);
      toast.error('Failed to update card status');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Loading card details...</p>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 mb-4">No virtual card found</p>
        <button
          onClick={createVirtualCard}
          disabled={creating}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {creating ? 'Creating...' : 'Create Virtual Card'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative p-6 bg-gradient-to-r from-blue-600 to-blue-400 rounded-xl text-white shadow-lg">
        <div className="absolute top-4 right-4">
          <CreditCard className="w-8 h-8 opacity-50" />
        </div>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm font-medium opacity-75">Virtual Card</p>
            <button
              onClick={() => setShowCardDetails(!showCardDetails)}
              className="p-1 hover:bg-white/10 rounded-full transition-colors"
            >
              {showCardDetails ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          
          <p className="text-xl tracking-wider">
            {showCardDetails 
              ? card.cardNumber.match(/.{1,4}/g)?.join(' ')
              : '•••• •••• •••• ' + card.cardNumber.slice(-4)
            }
          </p>
          
          <div className="flex justify-between items-end">
            <div>
              <p className="text-xs opacity-75">Expiry Date</p>
              <p className="font-medium">
                {showCardDetails 
                  ? `${card.expiryMonth}/${card.expiryYear}`
                  : '••/••'
                }
              </p>
            </div>
            <div>
              <p className="text-xs opacity-75">CVV</p>
              <p className="font-medium">
                {showCardDetails ? card.cvv : '•••'}
              </p>
            </div>
            <div>
              <p className="text-xs opacity-75">Balance</p>
              <p className="font-medium">₦{card.balance.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <p className={`flex items-center ${
          card.status === 'active' ? 'text-green-600' : 'text-red-600'
        }`}>
          <Lock className="w-4 h-4 mr-1" />
          {card.status === 'active' ? 'Active' : 'Frozen'}
        </p>
        <button
          onClick={toggleCardStatus}
          className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-500"
        >
          {card.status === 'active' ? 'Freeze Card' : 'Activate Card'}
        </button>
      </div>
    </div>
  );
}