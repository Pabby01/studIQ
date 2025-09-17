'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { 
  DollarSign, 
  Calculator, 
  ExternalLink, 
  TrendingUp, 
  Zap, 
  Clock,
  Coins,
  ArrowLeft,
  AlertTriangle,
  Star
} from 'lucide-react';
import Link from 'next/link';

const YIELD_FARMS = [
  {
    id: 'ray-sol-farm',
    name: 'RAY-SOL LP',
    platform: 'Raydium',
    apy: 45.2,
    tvl: '$1.2M',
    rewards: ['RAY', 'Additional Tokens'],
    multiplier: '2x',
    risk: 'High',
    lockPeriod: 'None',
    url: 'https://raydium.io/farms',
    logo: '🚜'
  },
  {
    id: 'orca-sol-farm',
    name: 'ORCA-SOL LP',
    platform: 'Orca',
    apy: 32.8,
    tvl: '$890K',
    rewards: ['ORCA'],
    multiplier: '1.5x',
    risk: 'Medium',
    lockPeriod: 'None',
    url: 'https://orca.so/farms',
    logo: '🌾'
  },
  {
    id: 'step-usdc-farm',
    name: 'STEP-USDC LP',
    platform: 'Step Finance',
    apy: 28.5,
    tvl: '$650K',
    rewards: ['STEP'],
    multiplier: '1.2x',
    risk: 'Medium',
    lockPeriod: '7 days',
    url: 'https://step.finance/farms',
    logo: '⚡'
  },
  {
    id: 'samo-ray-farm',
    name: 'SAMO-RAY LP',
    platform: 'Raydium',
    apy: 67.3,
    tvl: '$420K',
    rewards: ['RAY', 'SAMO'],
    multiplier: '3x',
    risk: 'Very High',
    lockPeriod: 'None',
    url: 'https://raydium.io/farms',
    logo: '🔥'
  }
];

export default function YieldFarmingPage() {
  const [selectedFarm, setSelectedFarm] = useState(YIELD_FARMS[0]);
  const [lpTokenAmount, setLpTokenAmount] = useState('');
  const [duration, setDuration] = useState('30'); // days
  const [calculatedReturns, setCalculatedReturns] = useState<{
    totalReturn: string;
    profit: string;
    dailyEarnings: string;
    rewardTokens: string;
    tradingFees: string;
  } | null>(null);

  const calculateReturns = () => {
    if (!lpTokenAmount || !duration) return;
    
    const amount = parseFloat(lpTokenAmount);
    const days = parseInt(duration);
    const apy = selectedFarm.apy / 100;
    
    const dailyRate = apy / 365;
    const totalReturn = amount * Math.pow(1 + dailyRate, days);
    const profit = totalReturn - amount;
    
    // Calculate reward tokens (simplified)
    const rewardTokens = profit * 0.7; // 70% in reward tokens
    const tradingFees = profit * 0.3; // 30% from trading fees
    
    setCalculatedReturns({
      totalReturn: totalReturn.toFixed(2),
      profit: profit.toFixed(2),
      dailyEarnings: (profit / days).toFixed(2),
      rewardTokens: rewardTokens.toFixed(2),
      tradingFees: tradingFees.toFixed(2)
    });
  };

  const handleStartFarming = () => {
    window.open(selectedFarm.url, '_blank');
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Medium': return 'text-yellow-600 bg-yellow-100';
      case 'High': return 'text-orange-600 bg-orange-100';
      case 'Very High': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getMultiplierColor = (multiplier: string) => {
    const value = parseFloat(multiplier);
    if (value >= 3) return 'text-red-600 bg-red-100';
    if (value >= 2) return 'text-orange-600 bg-orange-100';
    return 'text-green-600 bg-green-100';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
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
            <h1 className="text-3xl font-bold text-gray-900">Yield Farming</h1>
            <p className="text-gray-600">Stake LP tokens and earn additional rewards</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Available Farms */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Zap className="w-5 h-5 mr-2 text-purple-600" />
                Available Yield Farms
              </h2>
              
              <div className="grid gap-4">
                {YIELD_FARMS.map((farm) => (
                  <div 
                    key={farm.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedFarm.id === farm.id 
                        ? 'border-purple-500 bg-purple-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedFarm(farm)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{farm.logo}</span>
                        <div>
                          <h3 className="font-semibold">{farm.name}</h3>
                          <p className="text-sm text-gray-600">{farm.platform}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-600">{farm.apy}% APY</div>
                        <div className="flex items-center space-x-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${getRiskColor(farm.risk)}`}>
                            {farm.risk} Risk
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full ${getMultiplierColor(farm.multiplier)}`}>
                            {farm.multiplier}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                      <div>
                        <p className="text-gray-500">TVL</p>
                        <p className="font-medium">{farm.tvl}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Lock Period</p>
                        <p className="font-medium">{farm.lockPeriod}</p>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-gray-500 text-sm mb-1">Reward Tokens:</p>
                      <div className="flex flex-wrap gap-1">
                        {farm.rewards.map((reward, index) => (
                          <span key={index} className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                            {reward}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Farming Information */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Yield Farming Guide</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium mb-2 flex items-center">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    How Yield Farming Works
                  </h3>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• First, provide liquidity to get LP tokens</li>
                    <li>• Stake LP tokens in yield farms</li>
                    <li>• Earn additional reward tokens</li>
                    <li>• Compound rewards for higher yields</li>
                    <li>• Harvest rewards anytime</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2 flex items-center">
                    <AlertTriangle className="w-4 h-4 mr-2 text-yellow-600" />
                    Risks & Considerations
                  </h3>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Impermanent loss from underlying LP</li>
                    <li>• Reward token price volatility</li>
                    <li>• Smart contract risks</li>
                    <li>• High APY farms are often riskier</li>
                    <li>• Gas fees for claiming rewards</li>
                  </ul>
                </div>
              </div>
              
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <Star className="w-4 h-4 text-green-600" />
                    <h4 className="font-medium text-green-800">Pro Tips</h4>
                  </div>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>• Start with established farms</li>
                    <li>• Diversify across multiple farms</li>
                    <li>• Monitor reward token prices</li>
                    <li>• Consider auto-compounding</li>
                  </ul>
                </div>
                
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <h4 className="font-medium text-red-800">Warning Signs</h4>
                  </div>
                  <ul className="text-sm text-red-700 space-y-1">
                    <li>• Extremely high APY ({'>'}100%)</li>
                    <li>• New/unaudited protocols</li>
                    <li>• Low TVL farms</li>
                    <li>• Anonymous teams</li>
                  </ul>
                </div>
              </div>
            </Card>
          </div>

          {/* Calculator Sidebar */}
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Calculator className="w-5 h-5 mr-2 text-purple-600" />
                Farming Calculator
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    LP Token Amount (USD Value)
                  </label>
                  <Input 
                    type="number" 
                    placeholder="Enter LP token value"
                    value={lpTokenAmount}
                    onChange={(e) => setLpTokenAmount(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter the USD value of your LP tokens
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Farming Duration</label>
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
                  Calculate Farming Returns
                </Button>
                
                {calculatedReturns && (
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <h3 className="font-medium text-purple-900 mb-2">Projected Returns</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Value:</span>
                        <span className="font-medium">${calculatedReturns.totalReturn}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Profit:</span>
                        <span className="font-medium text-green-600">+${calculatedReturns.profit}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Daily Avg:</span>
                        <span className="font-medium">${calculatedReturns.dailyEarnings}</span>
                      </div>
                      <hr className="my-2" />
                      <div className="flex justify-between">
                        <span className="text-gray-600">Reward Tokens:</span>
                        <span className="font-medium text-purple-600">${calculatedReturns.rewardTokens}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Trading Fees:</span>
                        <span className="font-medium text-blue-600">${calculatedReturns.tradingFees}</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                    *Assumes constant APY and token prices
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
                  onClick={handleStartFarming} 
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Start Farming on {selectedFarm.platform}
                </Button>
                
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-purple-900">Selected Farm</span>
                    <span className="text-lg font-bold text-purple-600">{selectedFarm.apy}%</span>
                  </div>
                  <p className="text-xs text-purple-700">{selectedFarm.name} on {selectedFarm.platform}</p>
                  <div className="flex items-center space-x-2 mt-2">
                    <span className={`text-xs px-2 py-1 rounded ${getMultiplierColor(selectedFarm.multiplier)}`}>
                      {selectedFarm.multiplier} Multiplier
                    </span>
                  </div>
                </div>
                
                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center space-x-2">
                    <Coins className="w-4 h-4 text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-800">Rewards</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedFarm.rewards.map((reward, index) => (
                      <span key={index} className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded">
                        {reward}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="text-xs text-gray-500 text-center">
                  ⚠️ High yield = High risk. Farm responsibly!
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}