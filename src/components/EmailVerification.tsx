import { useAuth } from '../contexts/AuthContext';
import { Mail } from 'lucide-react';

export default function EmailVerification() {
  const { user, sendVerificationEmail } = useAuth();

  if (!user || user.emailVerified) return null;

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg mb-6 animate-fade-in">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <Mail className="h-5 w-5 text-yellow-400" aria-hidden="true" />
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
            Email Verification Required
          </h3>
          <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
            <p>
              Please verify your email address to access all features.
              Check your inbox for the verification link.
            </p>
          </div>
          <div className="mt-4">
            <div className="-mx-2 -my-1.5 flex">
              <button
                type="button"
                onClick={sendVerificationEmail}
                className="rounded-md bg-yellow-50 dark:bg-yellow-900/50 px-2 py-1.5 text-sm font-medium text-yellow-800 dark:text-yellow-200 hover:bg-yellow-100 dark:hover:bg-yellow-900/70 focus:outline-none focus:ring-2 focus:ring-yellow-600 focus:ring-offset-2 focus:ring-offset-yellow-50"
              >
                Resend verification email
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}