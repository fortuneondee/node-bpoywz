import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Copy, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AccountDetails() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  if (!user) return null;

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Details</h2>
      <div className="space-y-4">
        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
          <div>
            <p className="text-sm text-gray-500">Account Number</p>
            <p className="font-medium text-gray-900">{user.accountNumber}</p>
          </div>
          <button
            onClick={() => copyToClipboard(user.accountNumber)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            {copied ? (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            ) : (
              <Copy className="w-5 h-5 text-gray-400" />
            )}
          </button>
        </div>

        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
          <div>
            <p className="text-sm text-gray-500">Account Name</p>
            <p className="font-medium text-gray-900">{user.accountName}</p>
          </div>
          <button
            onClick={() => copyToClipboard(user.accountName)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            {copied ? (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            ) : (
              <Copy className="w-5 h-5 text-gray-400" />
            )}
          </button>
        </div>

        <div className="mt-4 text-sm text-gray-500">
          <p>To receive money:</p>
          <ol className="list-decimal list-inside mt-2 space-y-1">
            <li>Copy your account number</li>
            <li>Share it with anyone who wants to send you money</li>
            <li>They can transfer from any bank or fintech app</li>
            <li>Your balance will be updated automatically</li>
          </ol>
        </div>
      </div>
    </div>
  );
}