'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { 
  Wallet, 
  Send, 
  TrendingUp, 
  PiggyBank,
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  Target,
  Brain,
  Shield
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const WALLET_DATA = {
  balance: 125.50,
  solBalance: 2.45,
  usdcBalance: 123.05,
  recentTransactions: [
    { id: 1, type: 'receive', amount: 25.00, token: 'USDC', from: 'Campus Store', time: '2 hours ago' },
    { id: 2, type: 'send', amount: 12.50, token: 'SOL', to: 'Food Court', time: '1 day ago' },
    { id: 3, type: 'receive', amount: 50.00, token: 'USDC', from: 'Scholarship', time: '3 days ago' },
  ]
};

const SPENDING_DATA = [
  { name: 'Food', value: 120, color: '#FF6B6B' },
  { name: 'Books', value: 80, color: '#4ECDC4' },
  { name: 'Transport', value: 45, color: '#45B7D1' },
  { name: 'Entertainment', value: 35, color: '#FFA07A' },
];

const BALANCE_CHART_DATA = [
  { date: 'Mon', balance: 100 },
  { date: 'Tue', balance: 110 },
  { date: 'Wed', balance: 95 },
  { date: 'Thu', balance: 125 },
  { date: 'Fri', balance: 130 },
  { date: 'Sat', balance: 125 },
  { date: 'Sun', balance: 125.50 },
];

export function FinanceHub() {
  const [sendAmount, setSendAmount] = useState('');
  const [recipient, setRecipient] = useState('');

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-xl p-6 text-white">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Finance Hub</h1>
        <p className="text-green-100">
          Manage your wallet, track spending, and get AI-powered financial insights
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Wallet Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Wallet className="w-6 h-6 text-blue-600" />
                  <h2 className="text-lg font-semibold">Total Balance</h2>
                </div>
                <Button size="sm" variant="outline">
                  <ArrowUpRight className="w-4 h-4 mr-1" />
                  Export
                </Button>
              </div>
              
              <div className="mb-4">
                <p className="text-3xl font-bold text-gray-900 mb-1">
                  ${WALLET_DATA.balance.toFixed(2)}
                </p>
                <p className="text-sm text-gray-600">
                  +5.2% from last week
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">SOL</span>
                  <span className="font-medium">{WALLET_DATA.solBalance.toFixed(3)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">USDC</span>
                  <span className="font-medium">${WALLET_DATA.usdcBalance.toFixed(2)}</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <PiggyBank className="w-6 h-6 text-green-600" />
                <h2 className="text-lg font-semibold">Savings Goal</h2>
              </div>
              
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Emergency Fund</span>
                  <span className="text-sm font-medium">$500 / $1000</span>
                </div>
                <Progress value={50} className="h-2" />
              </div>

              <Button className="w-full" size="sm">
                <Target className="w-4 h-4 mr-2" />
                Set New Goal
              </Button>
            </Card>
          </div>

          {/* Balance Chart */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Balance History</h2>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={BALANCE_CHART_DATA}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="balance" stroke="#3B82F6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Send/Receive */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Quick Transfer</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium mb-3 flex items-center">
                  <Send className="w-4 h-4 mr-2" />
                  Send Tokens
                </h3>
                <div className="space-y-3">
                  <Input
                    placeholder="Recipient address or username"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                  />
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Amount"
                      value={sendAmount}
                      onChange={(e) => setSendAmount(e.target.value)}
                    />
                    <Button variant="outline">SOL</Button>
                    <Button variant="outline">USDC</Button>
                  </div>
                  <Button className="w-full">
                    <Send className="w-4 h-4 mr-2" />
                    Send
                  </Button>
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-3 flex items-center">
                  <ArrowDownLeft className="w-4 h-4 mr-2" />
                  Receive Tokens
                </h3>
                <div className="p-4 bg-gray-100 rounded-lg text-center">
                  <div className="w-24 h-24 bg-white border-2 border-dashed border-gray-300 rounded-lg mx-auto mb-3 flex items-center justify-center">
                    <span className="text-xs text-gray-500">QR Code</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">Your Wallet Address:</p>
                  <p className="text-xs font-mono bg-white px-2 py-1 rounded border break-all">
                    3k8J...9mK2
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Recent Transactions */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Recent Transactions</h2>
              <Button variant="ghost" size="sm">View All</Button>
            </div>
            
            <div className="space-y-3">
              {WALLET_DATA.recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center space-x-4 p-3 border rounded-lg">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    tx.type === 'receive' ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    {tx.type === 'receive' ? (
                      <ArrowDownLeft className="w-5 h-5 text-green-600" />
                    ) : (
                      <ArrowUpRight className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <p className="font-medium">
                      {tx.type === 'receive' ? `From ${tx.from}` : `To ${tx.to}`}
                    </p>
                    <p className="text-sm text-gray-600">{tx.time}</p>
                  </div>
                  
                  <div className="text-right">
                    <p className={`font-medium ${
                      tx.type === 'receive' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {tx.type === 'receive' ? '+' : '-'}${tx.amount.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-600">{tx.token}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* AI Financial Advisor */}
          <Card className="p-6 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
            <div className="flex items-center space-x-3 mb-4">
              <Brain className="w-5 h-5 text-purple-600" />
              <h3 className="font-semibold">AI Financial Advisor</h3>
            </div>
            
            <div className="space-y-3 text-sm">
              <div className="p-3 bg-white rounded-lg">
                <p className="text-purple-600 font-medium mb-1">💡 Tip</p>
                <p>You're spending 45% on food. Consider meal prepping to save $30/week!</p>
              </div>
              
              <div className="p-3 bg-white rounded-lg">
                <p className="text-blue-600 font-medium mb-1">🎯 Goal</p>
                <p>Save $50 more this month to reach your emergency fund target.</p>
              </div>
            </div>
            
            <Button size="sm" className="w-full mt-4">
              Get More Insights
            </Button>
          </Card>

          {/* Spending Breakdown */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Spending Breakdown</h3>
            <ResponsiveContainer width="100%" height={150}>
              <PieChart>
                <Pie
                  data={SPENDING_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={60}
                  dataKey="value"
                >
                  {SPENDING_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            
            <div className="space-y-2 mt-4">
              {SPENDING_DATA.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm">{item.name}</span>
                  </div>
                  <span className="text-sm font-medium">${item.value}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* DeFi Tools */}
          <Card className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold">DeFi Tools</h3>
            </div>
            
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <PiggyBank className="w-4 h-4 mr-2" />
                Stake SOL (5.2% APY)
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Shield className="w-4 h-4 mr-2" />
                Liquidity Pool
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <DollarSign className="w-4 h-4 mr-2" />
                Yield Farming
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}