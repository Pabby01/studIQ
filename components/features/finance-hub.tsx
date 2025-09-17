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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useWallet } from '@solana/wallet-adapter-react';
import { SolanaAgent } from '@/lib/solana-agent';
import { WalletConnect } from '@/components/wallet/wallet-connect';

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
  
  // Savings goals state
  const [savingsGoals, setSavingsGoals] = useState<any[]>([]);
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalDeadline, setNewGoalDeadline] = useState('');
  const [showCreateGoal, setShowCreateGoal] = useState(false);
  
  // Solana wallet integration
  const wallet = useWallet();
  const { publicKey, connected } = wallet;
  const [realWalletBalance, setRealWalletBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  // Real-time wallet balance fetching
  useEffect(() => {
    const fetchRealBalance = async () => {
      if (!publicKey || !connected) {
        setRealWalletBalance(null);
        return;
      }

      try {
        setBalanceLoading(true);
        const agent = new SolanaAgent(wallet, process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com');
        const balance = await agent.getBalance(publicKey.toString());
        setRealWalletBalance(balance);
      } catch (error) {
        console.error('Error fetching real wallet balance:', error);
        setRealWalletBalance(null);
      } finally {
        setBalanceLoading(false);
      }
    };

    fetchRealBalance();
    // Update balance every 30 seconds
    const interval = setInterval(fetchRealBalance, 30000);
    return () => clearInterval(interval);
  }, [publicKey, connected, wallet]);

  // Derived balances - prioritize real wallet balance when connected
  const totalBalance = useMemo(() => {
    // Use real wallet balance if connected and available
    if (connected && realWalletBalance !== null) {
      return realWalletBalance * 100; // Convert SOL to USD estimate (rough conversion)
    }
    // Fallback to database wallets
    const walletTotal = wallets.reduce((sum, w) => sum + Number(w.balance || 0), 0);
    if (walletTotal > 0) return walletTotal;
    // Final fallback: net from transactions
    return transactions.reduce((sum, tx) => sum + (tx.tx_type === 'receive' ? Number(tx.amount || 0) : -Number(tx.amount || 0)), 0);
  }, [wallets, transactions, connected, realWalletBalance]);

  const solBalance = useMemo(() => {
    // Use real wallet balance if connected
    if (connected && realWalletBalance !== null) {
      return realWalletBalance;
    }
    // Fallback to database wallets
    const fromWallets = wallets
      .filter((w) => String(w.token || w.symbol || '').toUpperCase() === 'SOL')
      .reduce((sum, w) => sum + Number(w.balance || 0), 0);
    return fromWallets;
  }, [wallets, connected, realWalletBalance]);

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
        
        // Load savings goals
        const gRes = await fetch('/api/savings-goals', { headers });
        if (gRes.ok) {
          const gJson = await gRes.json();
          setSavingsGoals(gJson.items || []);
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'savings_goals' }, async () => {
        try {
          const token = await getAccessToken();
          const res = await fetch('/api/savings-goals', { headers: { 'content-type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
          if (res.ok) setSavingsGoals((await res.json()).items || []);
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

  const handleCreateSavingsGoal = async () => {
    try {
      const targetAmount = parseFloat(newGoalTarget);
      if (!newGoalName || Number.isNaN(targetAmount) || targetAmount <= 0 || !newGoalDeadline) return;
      
      const token = await getAccessToken();
      const res = await fetch('/api/savings-goals', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          name: newGoalName,
          target_amount: targetAmount,
          current_amount: 0,
          deadline: newGoalDeadline,
          reminder_enabled: true
        })
      });
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || 'Failed to create savings goal');
      }
      
      const json = await res.json();
      setSavingsGoals((prev) => [json.item, ...prev]);
      setNewGoalName('');
      setNewGoalTarget('');
      setNewGoalDeadline('');
      setShowCreateGoal(false);
    } catch (e) {
      console.error(e);
      alert((e as any)?.message || 'Failed to create savings goal');
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
                <div className="flex items-center space-x-2">
                  <WalletConnect />
                  <Button size="sm" variant="outline">
                    <ArrowUpRight className="w-4 h-4 mr-1" />
                    Export
                  </Button>
                </div>
              </div>
              
              <div className="mb-4">
                {balanceLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <p className="text-lg text-gray-600">Loading balance...</p>
                  </div>
                ) : (
                  <>
                    <p className="text-3xl font-bold text-gray-900 mb-1">
                      ${totalBalance.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-600">
                      {connected ? 'Real-time Solana wallet balance' : 'Database wallet balance'}
                    </p>
                  </>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">SOL</span>
                  <span className="font-medium">
                    {balanceLoading ? '...' : solBalance.toFixed(4)}
                    {connected && <span className="text-xs text-green-600 ml-1">●</span>}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">USDC</span>
                  <span className="font-medium">${usdcBalance.toFixed(2)}</span>
                </div>
              </div>
              
              {!connected && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    💡 Connect your Solana wallet to see real-time balances
                  </p>
                </div>
              )}
            </Card>

            <Card className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Send className="w-6 h-6 text-blue-600" />
                <h2 className="text-lg font-semibold">Send Tokens</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Wallet selector */}
                <div className="space-y-1">
                  <label className="text-xs text-gray-600">From Wallet</label>
                  <Select value={selectedWalletId} onValueChange={setSelectedWalletId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a wallet" />
                    </SelectTrigger>
                    <SelectContent>
                      {wallets.length === 0 && (
                        <div className="px-3 py-2 text-sm text-gray-500">No wallets found</div>
                      )}
                      {wallets.map((w: any) => (
                        <SelectItem key={w.id} value={w.id}>
                          {String(w.public_key).slice(0, 4)}...{String(w.public_key).slice(-4)} • ${Number(w.balance || 0).toFixed(2)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Amount */}
                <div className="space-y-1">
                  <label className="text-xs text-gray-600">Amount (USD equiv.)</label>
                  <Input type="number" min="0" step="0.01" placeholder="0.00" value={sendAmount} onChange={(e) => setSendAmount(e.target.value)} />
                </div>

                {/* Recipient */}
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs text-gray-600">Recipient (optional note)</label>
                  <Input placeholder="e.g. Campus Store" value={recipient} onChange={(e) => setRecipient(e.target.value)} />
                </div>

                <div className="md:col-span-2 flex items-center justify-end">
                  <Button onClick={handleSend} disabled={loading || !selectedWalletId || !sendAmount}>
                    {loading ? 'Sending...' : 'Send'}
                  </Button>
                </div>
              </div>
              <div className="mt-3 text-xs text-gray-600">
                {selectedWallet ? (
                  <span>Available balance: ${Number(selectedWallet.balance || 0).toFixed(2)}</span>
                ) : (
                  <span>Select a wallet to see balance</span>
                )}
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

            {/* Savings Goals */}
            <Card className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Target className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold">Savings Goals</h3>
              </div>
              
              <div className="space-y-4">
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-blue-900">Emergency Fund</span>
                    <span className="text-sm text-blue-600">$350 / $500</span>
                  </div>
                  <Progress value={70} className="h-2 mb-2" />
                  <p className="text-xs text-blue-700">70% complete • $150 to go</p>
                </div>
                
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-green-900">New Laptop</span>
                    <span className="text-sm text-green-600">$200 / $800</span>
                  </div>
                  <Progress value={25} className="h-2 mb-2" />
                  <p className="text-xs text-green-700">25% complete • $600 to go</p>
                </div>
                
                <Button size="sm" className="w-full" variant="outline">
                  <Target className="w-4 h-4 mr-2" />
                  Create New Goal
                </Button>
                
                <div className="p-2 bg-yellow-50 rounded border border-yellow-200">
                  <p className="text-xs text-yellow-800">
                    💡 Daily reminder: Save $15 today to stay on track!
                  </p>
                </div>
              </div>
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
                <Button 
                  variant="outline" 
                  className="w-full justify-start hover:bg-green-50" 
                  onClick={() => window.open('/staking', '_blank')}
                >
                  <PiggyBank className="w-4 h-4 mr-2" />
                  Stake SOL (5.2% APY)
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start hover:bg-blue-50" 
                  onClick={() => window.open('/liquidity-pools', '_blank')}
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Liquidity Pools
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start hover:bg-purple-50" 
                  onClick={() => window.open('/yield-farming', '_blank')}
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Yield Farming
                </Button>
              </div>
              
              <div className="mt-4 p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border">
                <p className="text-xs text-gray-600 mb-1">💰 Potential Monthly Earnings</p>
                <p className="text-sm font-semibold text-green-600">$12.50 - $45.00</p>
                <p className="text-xs text-gray-500">Based on current balance</p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}