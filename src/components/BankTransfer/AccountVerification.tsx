interface AccountVerificationProps {
  verifying: boolean;
  accountName: string;
}

export default function AccountVerification({ verifying, accountName }: AccountVerificationProps) {
  if (verifying) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">
        Verifying account...
      </div>
    );
  }

  if (accountName) {
    return (
      <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-md">
        <p className="text-sm font-medium text-green-700 dark:text-green-300">
          Account Name: {accountName}
        </p>
      </div>
    );
  }

  return null;
}