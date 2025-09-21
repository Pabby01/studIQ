'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { 
  Shield, 
  Calculator, 
  ExternalLink, 
  TrendingUp, 
  Droplets, 
  Clock,
  DollarSign,
  ArrowLeft,
  AlertTriangle
} from 'lucide-react';
import Link from 'next/link';

const LIQUIDITY_POOLS = [
  {
    id: 'sol-usdc',
    name: 'SOL/USDC',
    platform: 'Raydium',
    apy: 12.5,
    tvl: '$2.4M',
    volume24h: '$450K',
    fee: 0.25,
    risk: 'Medium',
    url: 'https://raydium.io/pools',
    logo: '🌊'
  },
  {
    id: 'sol-usdt',
    name: 'SOL/USDT',
    platform: 'Orca',
    apy: 10.8,
    tvl: '$1.8M',
    volume24h: '$320K',
    fee: 0.3,
    risk: 'Medium',
    url: 'https://orca.so/pools',
    logo: '🐋'
  },
  {
    id: 'ray-sol',
    name: 'RAY/SOL',
    platform: 'Raydium',
    apy: 18.2,
    tvl: '$890K',
    volume24h: '$180K',
    fee: 0.25,
    risk: 'High',
    url: 'https://raydium.io/pools',
    logo: '⚡'
  }
];

export default function LiquidityPoolsPage() {
  const [selectedPool, setSelectedPool] = useState(LIQUIDITY_POOLS[0]);
  const [token1Amount, setToken1Amount] = useState('');
  const [token2Amount, setToken2Amount] = useState('');
  const [duration, setDuration] = useState('30'); // days
  const [calculatedReturns, setCalculatedReturns] = useState<{
    totalReturn: string;
    profit: string;
    dailyEarnings: string;
    fees: string;
  } | null>(null);

  const calculateReturns = () => {
    if (!token1Amount || !token2Amount || !duration) return;
    
    const amount1 = parseFloat(token1Amount);
    const amount2 = parseFloat(token2Amount);
    const days = parseInt(duration);
    const apy = selectedPool.apy / 100;
    
    // Simplified calculation - assumes equal value in both tokens
    const totalValue = (amount1 * 100) + amount2; // Assuming SOL = $100 for calculation
    const dailyRate = apy / 365;
    const totalReturn = totalValue * Math.pow(1 + dailyRate, days);
    const profit = totalReturn - totalValue;
    
    setCalculatedReturns({
      totalReturn: totalReturn.toFixed(2),
      profit: profit.toFixed(2),
      dailyEarnings: (profit / days).toFixed(2),
      fees: (totalValue * selectedPool.fee / 100).toFixed(2)
    });
  };

  const handleProvideLiquidity = () => {
    window.open(selectedPool.url, '_blank');
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Low': return 'text-green-600 bg-green-100';
      case 'Medium': return 'text-yellow-600 bg-yellow-100';
      case 'High': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-8">
          <Link href="/app">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Finance Hub
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Liquidity Pools</h1>
            <p className="text-gray-600">Provide liquidity and earn trading fees</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Available Pools */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Droplets className="w-5 h-5 mr-2 text-blue-600" />
                Available Liquidity Pools
              </h2>
              
              <div className="grid gap-4">
                {LIQUIDITY_POOLS.map((pool) => (
                  <div 
                    key={pool.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedPool.id === pool.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedPool(pool)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{pool.logo}</span>
                        <div>
                          <h3 className="font-semibold">{pool.name}</h3>
                          <p className="text-sm text-gray-600">{pool.platform}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-600">{pool.apy}% APY</div>
                        <span className={`text-xs px-2 py-1 rounded-full ${getRiskColor(pool.risk)}`}>
                          {pool.risk} Risk
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">TVL</p>
                        <p className="font-medium">{pool.tvl}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">24h Volume</p>
                        <p className="font-medium">{pool.volume24h}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Fee</p>
                        <p className="font-medium">{pool.fee}%</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Pool Information */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Liquidity Pool Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium mb-2 flex items-center">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    How It Works
                  </h3>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Provide equal value of two tokens</li>
                    <li>• Earn fees from trades in the pool</li>
                    <li>• Receive LP tokens representing your share</li>
                    <li>• Withdraw anytime (subject to slippage)</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2 flex items-center">
                    <AlertTriangle className="w-4 h-4 mr-2 text-yellow-600" />
                    Risks to Consider
                  </h3>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Impermanent loss from price divergence</li>
                    <li>• Smart contract risks</li>
                    <li>• Market volatility affects returns</li>
                    <li>• Liquidity may be locked temporarily</li>
                  </ul>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-800">Impermanent Loss Warning</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      If token prices diverge significantly, you may receive less value when withdrawing 
                      compared to simply holding the tokens. Consider this risk before providing liquidity.
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Calculator Sidebar */}
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Calculator className="w-5 h-5 mr-2 text-purple-600" />
                Liquidity Calculator
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {selectedPool.name.split('/')[0]} Amount
                  </label>
                  <Input 
                    type="number" 
                    placeholder="Enter amount"
                    value={token1Amount}
                    onChange={(e) => setToken1Amount(e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {selectedPool.name.split('/')[1]} Amount
                  </label>
                  <Input 
                    type="number" 
                    placeholder="Enter amount"
                    value={token2Amount}
                    onChange={(e) => setToken2Amount(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Provide equal USD value of both tokens
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Duration</label>
                  <Select value={duration} onValueChange={setDuration}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">1 Week</SelectItem>
                      <SelectItem value="30">1 Month</SelectItem>
                      <SelectItem value="90">3 Months</SelectItem>
                      <SelectItem value="180">6 Months</SelectItem>
                      <SelectItem value="365">1 Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Button onClick={calculateReturns} className="w-full">
                  Calculate Returns
                </Button>
                
                {calculatedReturns && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h3 className="font-medium text-blue-900 mb-2">Projected Returns</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Value:</span>
                        <span className="font-medium">${calculatedReturns.totalReturn}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Profit:</span>
                        <span className="font-medium text-green-600">+${calculatedReturns.profit}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Daily Avg:</span>
                        <span className="font-medium">${calculatedReturns.dailyEarnings}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Platform Fees:</span>
                        <span className="font-medium text-red-600">-${calculatedReturns.fees}</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      *Excludes impermanent loss
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Quick Actions */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Quick Actions</h3>
              
              <div className="space-y-3">
                <Button 
                  onClick={handleProvideLiquidity} 
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Provide Liquidity on {selectedPool.platform}
                </Button>
                
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-blue-900">Selected Pool</span>
                    <span className="text-lg font-bold text-blue-600">{selectedPool.apy}%</span>
                  </div>
                  <p className="text-xs text-blue-700">{selectedPool.name} on {selectedPool.platform}</p>
                </div>
                
                <div className="text-xs text-gray-500 text-center">
                  ⚠️ Understand impermanent loss before providing liquidity
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}