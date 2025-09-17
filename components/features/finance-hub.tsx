/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
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
  Shield,
  Plus
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAuth } from '@/components/providers/providers';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useWallet } from '@solana/wallet-adapter-react';
import { SolanaAgent } from '@/lib/solana-agent';
import { WalletConnect } from '@/components/wallet/wallet-connect';
import QRCode from 'qrcode';
import { toast } from 'sonner';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import Image from 'next/image';

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
  const { getAccessToken, user } = useAuth();
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
  const { publicKey, connected, signTransaction } = wallet;
  const [realWalletBalance, setRealWalletBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  
  // QR Code generation
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // Additional savings goals state
  const [isLoadingGoals, setIsLoadingGoals] = useState(false);
  const [goalsError, setGoalsError] = useState<string | null>(null);
  
  // Recipient addresses state
  const [savedAddresses, setSavedAddresses] = useState<{id: string, name: string, address: string}[]>([]);
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newAddressName, setNewAddressName] = useState('');
  const [newAddressValue, setNewAddressValue] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState('');

  // Fetch savings goals
  const fetchSavingsGoals = async () => {
    if (!user?.id) return;
    
    setIsLoadingGoals(true);
    setGoalsError(null);
    try {
      const token = await getAccessToken();
      const headers: HeadersInit = { 
        'content-type': 'application/json', 
        ...(token ? { Authorization: `Bearer ${token}` } : {}) 
      };
      const response = await fetch('/api/savings-goals', { headers });
      if (response.ok) {
        const goals = await response.json();
        setSavingsGoals(goals.items || goals);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch savings goals' }));
        let errorMessage = errorData.error || `Error ${response.status}: ${response.statusText}`;
        
        // Provide specific error messages based on status code
        if (response.status === 401) {
          errorMessage = 'Authentication failed. Please log in again.';
          toast.error('Please log in again to access your savings goals');
        } else if (response.status === 403) {
          errorMessage = 'Access denied. Your account may need to be set up.';
          toast.error('Account setup required. Please contact support.');
        } else if (response.status === 500) {
          errorMessage = 'Server error. Please try again later.';
          toast.error('Server error. Please try again in a few moments.');
        } else {
          toast.error('Failed to load savings goals');
        }
        
        setGoalsError(errorMessage);
      }
    } catch (error) {
      console.error('Error fetching savings goals:', error);
      setGoalsError('Network error: Unable to connect to server');
      toast.error('Unable to load savings goals. Please check your connection.');
    } finally {
      setIsLoadingGoals(false);
    }
  };
  
  // Create new savings goal
  const handleCreateSavingsGoal = async () => {
    if (!user?.id || !newGoalName || !newGoalTarget || !newGoalDeadline) return;
    
    try {
      const token = await getAccessToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      };
      const response = await fetch('/api/savings-goals', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: newGoalName,
          target_amount: parseFloat(newGoalTarget),
          current_amount: 0,
          deadline: newGoalDeadline,
          user_id: user.id
        })
      });
      
      if (response.ok) {
        const newGoal = await response.json();
        setSavingsGoals(prev => [...prev, newGoal.item || newGoal]);
        setShowCreateGoal(false);
        setNewGoalName('');
        setNewGoalTarget('');
        setNewGoalDeadline('');
        toast.success('Savings goal created successfully!');
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to create savings goal' }));
        let errorMessage = errorData.error || 'Failed to create savings goal';
        
        // Provide specific error messages based on status code
        if (response.status === 401) {
          errorMessage = 'Authentication failed. Please log in again.';
          toast.error('Please log in again to create savings goals');
        } else if (response.status === 400) {
          errorMessage = errorData.error || 'Invalid goal data. Please check your inputs.';
          toast.error(errorMessage);
        } else if (response.status === 403) {
          errorMessage = 'Access denied. Your account may need to be set up.';
          toast.error('Account setup required. Please contact support.');
        } else if (response.status === 500) {
          errorMessage = 'Server error. Please try again later.';
          toast.error('Server error. Please try again in a few moments.');
        } else {
          toast.error(errorMessage);
        }
      }
    } catch (error) {
      console.error('Error creating savings goal:', error);
      toast.error('Network error. Please check your connection and try again.');
    }
  };
  
  // Load savings goals on component mount
  useEffect(() => {
    fetchSavingsGoals();
  }, [user?.id]);
  
  // Load saved addresses from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('savedAddresses');
    if (saved) {
      setSavedAddresses(JSON.parse(saved));
    }
  }, []);
  
  // Save address to localStorage
  const handleSaveAddress = () => {
    if (!newAddressName || !newAddressValue) return;
    
    try {
      // Validate Solana address
      new PublicKey(newAddressValue);
      
      const newAddress = {
        id: Date.now().toString(),
        name: newAddressName,
        address: newAddressValue
      };
      
      const updatedAddresses = [...savedAddresses, newAddress];
      setSavedAddresses(updatedAddresses);
      localStorage.setItem('savedAddresses', JSON.stringify(updatedAddresses));
      
      setNewAddressName('');
      setNewAddressValue('');
      setShowAddAddress(false);
      toast.success('Address saved successfully!');
    } catch (error) {
      toast.error('Invalid Solana address format');
    }
  };
  
  // Remove saved address
  const handleRemoveAddress = (id: string) => {
    const updatedAddresses = savedAddresses.filter(addr => addr.id !== id);
    setSavedAddresses(updatedAddresses);
    localStorage.setItem('savedAddresses', JSON.stringify(updatedAddresses));
    toast.success('Address removed successfully!');
  };

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

  // Include connected Solana wallet in the available wallets
  const availableWallets = useMemo(() => {
    const dbWallets = [...wallets];
    
    // Add connected Solana wallet if available
    if (connected && publicKey) {
      const solanaWallet = {
        id: 'connected-solana',
        public_key: publicKey.toString(),
        balance: realWalletBalance || 0,
        token: 'SOL',
        user_id: null,
        created_at: new Date().toISOString()
      };
      
      // Check if this wallet is already in the database
      const existingWallet = dbWallets.find(w => w.public_key === publicKey.toString());
      if (!existingWallet) {
        dbWallets.unshift(solanaWallet); // Add at the beginning
      }
    }
    
    return dbWallets;
  }, [wallets, connected, publicKey, realWalletBalance]);

  const selectedWallet = useMemo(() => availableWallets.find((w) => w.id === selectedWalletId), [availableWallets, selectedWalletId]);

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

  // Auto-select connected Solana wallet when available
  useEffect(() => {
    if (connected && publicKey && !selectedWalletId) {
      setSelectedWalletId('connected-solana');
    }
  }, [connected, publicKey, selectedWalletId]);

  // Generate QR code when selected wallet changes
  useEffect(() => {
    const generateQRCode = async () => {
      if (selectedWallet?.public_key) {
        try {
          const dataUrl = await QRCode.toDataURL(selectedWallet.public_key, {
            width: 96,
            margin: 1,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          });
          setQrCodeDataUrl(dataUrl);
        } catch (error) {
          console.error('Error generating QR code:', error);
          setQrCodeDataUrl(null);
        }
      } else {
        setQrCodeDataUrl(null);
      }
    };

    generateQRCode();
  }, [selectedWallet?.public_key]);

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
    if (!selectedWalletId || !sendAmount || !selectedRecipient || (selectedRecipient === 'new' && !newAddressValue)) return;
    
    const recipientAddress = selectedRecipient === 'new' ? newAddressValue : selectedRecipient;
    
    // Validate recipient address
    try {
      new PublicKey(recipientAddress);
    } catch (error) {
      toast.error('Invalid recipient address format');
      return;
    }
    
    setLoading(true);
    try {
      const amountNum = parseFloat(sendAmount);
      if (Number.isNaN(amountNum) || amountNum <= 0) return;
      
      // Check if we have a connected Solana wallet for signing
      if (publicKey && signTransaction) {
        try {
          // Create Solana connection
          const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
          
          // Convert amount to lamports
          const lamports = Math.floor(amountNum * LAMPORTS_PER_SOL);
          
          // Create recipient public key
          const recipientPubkey = new PublicKey(recipientAddress);
          
          // Create transaction
          const transaction = new Transaction().add(
            SystemProgram.transfer({
              fromPubkey: publicKey,
              toPubkey: recipientPubkey,
              lamports: lamports,
            })
          );
          
          // Get recent blockhash
          const { blockhash } = await connection.getLatestBlockhash();
          transaction.recentBlockhash = blockhash;
          transaction.feePayer = publicKey;
          
          toast.info('Please approve the transaction in your wallet...');
          
          // Sign transaction with wallet
          const signedTransaction = await signTransaction(transaction);
          
          // Send transaction
          const signature = await connection.sendRawTransaction(signedTransaction.serialize());
          
          toast.info('Transaction submitted. Waiting for confirmation...');
          
          // Wait for confirmation
          await connection.confirmTransaction(signature, 'confirmed');
          
          toast.success(`Transaction completed! Signature: ${signature.slice(0, 8)}...`);
          
          // Update local state
          const newTransaction = {
            id: signature,
            amount: amountNum,
            type: 'send',
            recipient: recipientAddress,
            timestamp: new Date().toISOString(),
            status: 'completed'
          };
          setTransactions(prev => [newTransaction, ...prev]);
        } catch (error: any) {
          console.error('Transaction failed:', error);
          if (error.message?.includes('User rejected')) {
            toast.error('Transaction was cancelled by user');
          } else {
            toast.error(`Transaction failed: ${error.message || 'Unknown error'}`);
          }
          throw error;
        }
      } else {
        // Fallback for database transactions
        const token = await getAccessToken();
        const res = await fetch('/api/transactions', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ 
            wallet_id: selectedWalletId, 
            amount: amountNum, 
            tx_type: 'send',
            recipient: recipientAddress
          })
        });
        
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error || 'Failed to send');
        }
        
        const json = await res.json();
        setTransactions((prev) => [json.item, ...prev]);
        toast.success('Transaction completed!');
      }
      
      // Reset form
      setSendAmount('');
      setSelectedRecipient('');
      setNewAddressValue('');
      
    } catch (e) {
      console.error(e);
      toast.error((e as any)?.message || 'Transaction failed. Please try again.');
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
                      {availableWallets.length === 0 && (
                        <div className="px-3 py-2 text-sm text-gray-500">No wallets found</div>
                      )}
                      {availableWallets.map((w: any) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.id === 'connected-solana' ? '🟢 ' : ''}{String(w.public_key).slice(0, 4)}...{String(w.public_key).slice(-4)} • {w.token === 'SOL' ? `${Number(w.balance || 0).toFixed(4)} SOL` : `$${Number(w.balance || 0).toFixed(2)}`}
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
                  <label className="text-xs text-gray-600">Recipient Address</label>
                  <div className="space-y-2">
                    <Select value={selectedRecipient} onValueChange={setSelectedRecipient}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select saved address or enter new" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">Enter new address</SelectItem>
                        {savedAddresses.map((addr) => (
                          <SelectItem key={addr.id} value={addr.address}>
                            {addr.name} ({addr.address.slice(0, 8)}...{addr.address.slice(-4)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {selectedRecipient === 'new' && (
                      <div className="space-y-2">
                        <Input 
                          placeholder="Enter Solana wallet address" 
                          value={newAddressValue}
                          onChange={(e) => setNewAddressValue(e.target.value)}
                        />
                        {!showAddAddress ? (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => setShowAddAddress(true)}
                            disabled={!newAddressValue}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Save Address
                          </Button>
                        ) : (
                          <div className="flex gap-2">
                            <Input 
                              placeholder="Address name (e.g., John's Wallet)"
                              value={newAddressName}
                              onChange={(e) => setNewAddressName(e.target.value)}
                              className="flex-1"
                            />
                            <Button size="sm" onClick={handleSaveAddress} disabled={!newAddressName}>
                              Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => {
                              setShowAddAddress(false);
                              setNewAddressName('');
                            }}>
                              Cancel
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {savedAddresses.length > 0 && (
                      <div className="mt-3">
                        <label className="block text-xs font-medium text-gray-600 mb-2">Saved Addresses</label>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {savedAddresses.map((addr) => (
                            <div key={addr.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                              <div>
                                <span className="font-medium">{addr.name}</span>
                                <span className="text-gray-500 ml-2">
                                  {addr.address.slice(0, 8)}...{addr.address.slice(-4)}
                                </span>
                              </div>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={() => handleRemoveAddress(addr.id)}
                                className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                              >
                                ×
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="md:col-span-2 flex items-center justify-end">
                  <Button onClick={handleSend} disabled={loading || !selectedWalletId || !sendAmount || (!selectedRecipient || (selectedRecipient === 'new' && !newAddressValue))}>
                    {loading ? 'Sending...' : 'Send'}
                  </Button>
                </div>
              </div>
              <div className="mt-3 text-xs text-gray-600">
                {selectedWallet ? (
                  <span>Available balance: {selectedWallet.token === 'SOL' ? `${Number(selectedWallet.balance || 0).toFixed(4)} SOL` : `$${Number(selectedWallet.balance || 0).toFixed(2)}`}</span>
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
                  <div className="w-24 h-24 bg-white border-2 border-solid border-gray-300 rounded-lg mx-auto mb-3 flex items-center justify-center overflow-hidden">
                    {qrCodeDataUrl ? (
                      <Image 
                        src={qrCodeDataUrl} 
                        alt="Wallet QR Code" 
                        width={96}
                        height={96}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-xs text-gray-500">No Wallet</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">Your Wallet Address:</p>
                  <p className="text-xs font-mono bg-white px-2 py-1 rounded border break-all">
                    {selectedWallet?.public_key || '—'}
                  </p>
                  {selectedWallet?.public_key && (
                    <button 
                      className="mt-2 text-xs text-blue-600 hover:text-blue-800"
                      onClick={() => navigator.clipboard.writeText(selectedWallet.public_key)}
                    >
                      📋 Copy Address
                    </button>
                  )}
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
                {isLoadingGoals ? (
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-center">
                    <p className="text-sm text-gray-600">Loading savings goals...</p>
                  </div>
                ) : goalsError ? (
                  <div className="p-3 bg-red-50 rounded-lg border border-red-200 text-center">
                    <p className="text-sm text-red-600 mb-2">{goalsError}</p>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={fetchSavingsGoals}
                      className="text-red-600 border-red-300 hover:bg-red-100"
                    >
                      Try Again
                    </Button>
                  </div>
                ) : savingsGoals.length > 0 ? (
                  savingsGoals.map((goal: any) => {
                    const progress = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;
                    const remaining = goal.target_amount - goal.current_amount;
                    const isCompleted = progress >= 100;
                    
                    return (
                      <div key={goal.id} className={`p-3 rounded-lg border ${
                        isCompleted ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`font-medium ${
                            isCompleted ? 'text-green-900' : 'text-blue-900'
                          }`}>{goal.name}</span>
                          <span className={`text-sm ${
                            isCompleted ? 'text-green-600' : 'text-blue-600'
                          }`}>${goal.current_amount} / ${goal.target_amount}</span>
                        </div>
                        <Progress value={Math.min(progress, 100)} className="h-2 mb-2" />
                        <p className={`text-xs ${
                          isCompleted ? 'text-green-700' : 'text-blue-700'
                        }`}>
                          {isCompleted ? '🎉 Goal completed!' : `${Math.round(progress)}% complete • $${remaining} to go`}
                        </p>
                        {goal.deadline && (
                          <p className="text-xs text-gray-500 mt-1">
                            Deadline: {new Date(goal.deadline).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-center">
                    <p className="text-sm text-gray-600">No savings goals yet</p>
                    <p className="text-xs text-gray-500 mt-1">Create your first goal to start saving!</p>
                  </div>
                )}
                
                {!showCreateGoal ? (
                  <Button size="sm" className="w-full" variant="outline" onClick={() => setShowCreateGoal(true)}>
                    <Target className="w-4 h-4 mr-2" />
                    Create New Goal
                  </Button>
                ) : (
                  <div className="space-y-3 p-3 bg-white rounded-lg border">
                    <Input 
                      placeholder="Goal name (e.g., Emergency Fund)"
                      value={newGoalName}
                      onChange={(e) => setNewGoalName(e.target.value)}
                    />
                    <Input 
                      type="number"
                      placeholder="Target amount ($)"
                      value={newGoalTarget}
                      onChange={(e) => setNewGoalTarget(e.target.value)}
                    />
                    <Input 
                      type="date"
                      placeholder="Deadline"
                      value={newGoalDeadline}
                      onChange={(e) => setNewGoalDeadline(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleCreateSavingsGoal} disabled={!newGoalName || !newGoalTarget || !newGoalDeadline}>
                        Create Goal
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => {
                        setShowCreateGoal(false);
                        setNewGoalName('');
                        setNewGoalTarget('');
                        setNewGoalDeadline('');
                      }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
                
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