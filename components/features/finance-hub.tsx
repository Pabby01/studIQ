/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { useAuth } from '@/components/providers/providers';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

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
  const { getAccessToken } = useAuth();
  const supabase = createClientComponentClient();
  const [wallets, setWallets] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState<string>('');
  const [income, setIncome] = useState('');
  const [expenses, setExpenses] = useState('');
  const [loading, setLoading] = useState(false);

  // Derived balances
  const totalBalance = useMemo(() => {
    // Prefer wallet balances if available
    const walletTotal = wallets.reduce((sum, w) => sum + Number(w.balance || 0), 0);
    if (walletTotal > 0) return walletTotal;
    // Fallback: net from transactions
    return transactions.reduce((sum, tx) => sum + (tx.tx_type === 'receive' ? Number(tx.amount || 0) : -Number(tx.amount || 0)), 0);
  }, [wallets, transactions]);

  const solBalance = useMemo(() => {
    const fromWallets = wallets
      .filter((w) => String(w.token || w.symbol || '').toUpperCase() === 'SOL')
      .reduce((sum, w) => sum + Number(w.balance || 0), 0);
    return fromWallets;
  }, [wallets]);

  const usdcBalance = useMemo(() => {
    const fromWallets = wallets
      .filter((w) => String(w.token || w.symbol || '').toUpperCase() === 'USDC')
      .reduce((sum, w) => sum + Number(w.balance || 0), 0);
    return fromWallets;
  }, [wallets]);

  const selectedWallet = useMemo(() => wallets.find((w) => w.id === selectedWalletId), [wallets, selectedWalletId]);

  useEffect(() => {
    const load = async () => {
      try {
        const token = await getAccessToken();
        const headers: HeadersInit = {
          'content-type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        };
        const [wRes, tRes, fRes] = await Promise.all([
          fetch('/api/wallets', { headers }),
          fetch('/api/transactions', { headers }),
          fetch('/api/finance', { headers })
        ]);
        if (wRes.ok) {
          const wJson = await wRes.json();
          setWallets(wJson.items || []);
          if (!selectedWalletId && (wJson.items?.length ?? 0) > 0) {
            setSelectedWalletId(wJson.items[0].id);
          }
        }
        if (tRes.ok) {
          const tJson = await tRes.json();
          setTransactions(tJson.items || []);
        }
        if (fRes.ok) {
          const fJson = await fRes.json();
          setPlans(fJson.items || []);
        }
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, [getAccessToken]);

  // Realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('finance-hub')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, async () => {
        try {
          const token = await getAccessToken();
          const res = await fetch('/api/transactions', { headers: { 'content-type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
          if (res.ok) setTransactions((await res.json()).items || []);
        } catch {}
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallets' }, async () => {
        try {
          const token = await getAccessToken();
          const res = await fetch('/api/wallets', { headers: { 'content-type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
          if (res.ok) setWallets((await res.json()).items || []);
        } catch {}
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'finance_plans' }, async () => {
        try {
          const token = await getAccessToken();
          const res = await fetch('/api/finance', { headers: { 'content-type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
          if (res.ok) setPlans((await res.json()).items || []);
        } catch {}
      })
      .subscribe();
    return () => {
      try { supabase.removeChannel(channel); } catch {}
    };
  }, [supabase, getAccessToken]);

  const handleSend = async () => {
    try {
      setLoading(true);
      const amountNum = parseFloat(sendAmount);
      if (!selectedWalletId || Number.isNaN(amountNum) || amountNum <= 0) return;
      const token = await getAccessToken();
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ wallet_id: selectedWalletId, amount: amountNum, tx_type: 'send' })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || 'Failed to send');
      }
      const json = await res.json();
      setTransactions((prev) => [json.item, ...prev]);
      setSendAmount('');
      setRecipient('');
    } catch (e) {
      console.error(e);
      alert((e as any)?.message || 'Failed to send');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = async () => {
    try {
      setLoading(true);
      const inc = parseFloat(income || '0');
      const exp = parseFloat(expenses || '0');
      const token = await getAccessToken();
      const res = await fetch('/api/finance', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ income: inc, expenses: exp })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || 'Failed to create plan');
      }
      const json = await res.json();
      setPlans((prev) => [json.item, ...prev]);
    } catch (e) {
      console.error(e);
      alert((e as any)?.message || 'Failed to create plan');
    } finally {
      setLoading(false);
    }
  };

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
                  ${totalBalance.toFixed(2)}
                </p>
                <p className="text-sm text-gray-600">
                  Updated in real time
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">SOL</span>
                  <span className="font-medium">{solBalance.toFixed(3)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">USDC</span>
                  <span className="font-medium">${usdcBalance.toFixed(2)}</span>
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
                  <span className="text-sm font-medium">${Math.min(totalBalance, 1000).toFixed(0)} / $1000</span>
                </div>
                <Progress value={Math.min(100, (totalBalance / 1000) * 100)} className="h-2" />
              </div>

              <Button className="w-full" size="sm">Update Goal</Button>
            </Card>

            <Card className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Send className="w-6 h-6 text-blue-600" />
                <h2 className="text-lg font-semibold">Send Tokens</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* ... existing inputs ... */}
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
                    {selectedWallet?.public_key ? `${String(selectedWallet.public_key).slice(0,4)}...${String(selectedWallet.public_key).slice(-4)}` : '—'}
                  </p>
                </div>
              </div>
            </Card>

            {/* Recent Transactions */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Recent Transactions</h2>
                <Button variant="ghost" size="sm" onClick={async () => {
                  const token = await getAccessToken();
                  const res = await fetch('/api/transactions', { headers: { 'content-type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
                  if (res.ok) {
                    const json = await res.json();
                    setTransactions(json.items || []);
                  }
                }}>Refresh</Button>
              </div>
              <div className="space-y-3">
                {transactions.length === 0 && (
                  <div className="text-sm text-gray-600">No transactions yet.</div>
                )}
                {transactions.map((tx: any) => (
                  <div key={tx.id} className="flex items-center space-x-4 p-3 border rounded-lg">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      tx.tx_type === 'receive' ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {tx.tx_type === 'receive' ? (
                        <ArrowDownLeft className="w-5 h-5 text-green-600" />
                      ) : (
                        <ArrowUpRight className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">
                        {tx.tx_type === 'receive' ? `From ${tx.from || 'Unknown'}` : `To ${recipient || 'Unknown'}`}
                      </p>
                      <p className="text-sm text-gray-600">{new Date(tx.created_at).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium ${
                        tx.tx_type === 'receive' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {tx.tx_type === 'receive' ? '+' : '-'}${Number(tx.amount).toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-600">{tx.token || 'TOKEN'}</p>
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

              <div className="grid grid-cols-2 gap-2 mb-3">
                <Input type="number" placeholder="Income" value={income} onChange={(e) => setIncome(e.target.value)} />
                <Input type="number" placeholder="Expenses" value={expenses} onChange={(e) => setExpenses(e.target.value)} />
              </div>
              <Button size="sm" className="w-full mb-3" onClick={handleCreatePlan} disabled={loading}>
                {loading ? 'Analyzing...' : 'Create Plan'}
              </Button>

              <div className="space-y-3 text-sm">
                {plans[0]?.ai_advice ? (
                  <div className="p-3 bg-white rounded-lg">
                    <p className="text-purple-600 font-medium mb-1">Advice</p>
                    <p>{plans[0].ai_advice}</p>
                  </div>
                ) : (
                  <>
                    <div className="p-3 bg-white rounded-lg">
                      <p className="text-purple-600 font-medium mb-1">💡 Tip</p>
                      <p>You&apos;re spending 45% on food. Consider meal prepping to save $30/week!</p>
                    </div>
                    <div className="p-3 bg-white rounded-lg">
                      <p className="text-blue-600 font-medium mb-1">🎯 Goal</p>
                      <p>Save $50 more this month to reach your emergency fund target.</p>
                    </div>
                  </>
                )}
              </div>

              <Button size="sm" className="w-full mt-4" onClick={async () => {
                const token = await getAccessToken();
                const res = await fetch('/api/finance', { headers: { 'content-type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
                if (res.ok) {
                  const json = await res.json();
                  setPlans(json.items || []);
                }
              }}>
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
    </div>
  );
}