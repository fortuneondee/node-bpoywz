import { useState } from 'react';
import { Users, CircleDollarSign, Settings, BarChart3, Wallet } from 'lucide-react';
import UserList from './UserList';
import TransactionApproval from './TransactionApproval';
import SystemSettings from './SystemSettings';
import Analytics from './Analytics';
import PayoutRequests from './PayoutRequests';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('users');

  const tabs = [
    { id: 'users', label: 'Users', icon: Users },
    { id: 'transactions', label: 'Transactions', icon: CircleDollarSign },
    { id: 'payouts', label: 'Payouts', icon: Wallet },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Admin Dashboard
          </h1>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex space-x-4 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-4 py-2 rounded-md whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}
              >
                <Icon className="w-5 h-5 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          {activeTab === 'users' && <UserList />}
          {activeTab === 'transactions' && <TransactionApproval />}
          {activeTab === 'payouts' && <PayoutRequests />}
          {activeTab === 'settings' && <SystemSettings />}
          {activeTab === 'analytics' && <Analytics />}
        </div>
      </div>
    </div>
  );
}