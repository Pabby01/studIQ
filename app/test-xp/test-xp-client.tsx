'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { XPDisplay } from '@/components/xp/xp-display';
import { BadgeDisplay } from '@/components/xp/badge-display';
import { LeaderboardPage } from '@/components/leaderboard/leaderboard-page';

export function TestXPClient() {
  const [testUserId, setTestUserId] = useState('user1-test-id');
  const [xpAmount, setXpAmount] = useState(25);
  const [action, setAction] = useState('test_action');
  const [hubType, setHubType] = useState('campus');
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);
  const { toast } = useToast();

  const handleXPUpdate = (data: any) => {
    toast({
      title: "XP Updated!",
      description: `Gained ${data.xpGained} XP. Total: ${data.totalXP}`,
    });
  };

  const awardXP = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/xp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: testUserId,
          action,
          xpAmount,
          hubType,
          metadata: { test: true, timestamp: new Date().toISOString() }
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to award XP: ${response.statusText}`);
      }

      const result = await response.json();
      setTestResults(prev => [...prev, {
        timestamp: new Date().toISOString(),
        action: 'Award XP',
        result,
        success: true
      }]);

      toast({
        title: "XP Awarded Successfully!",
        description: `Awarded ${xpAmount} XP for ${action}`,
      });
    } catch (error) {
      console.error('Error awarding XP:', error);
      setTestResults(prev => [...prev, {
        timestamp: new Date().toISOString(),
        action: 'Award XP',
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      }]);

      toast({
        title: "Error",
        description: "Failed to award XP",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkBadges = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/badges/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: testUserId
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to check badges: ${response.statusText}`);
      }

      const result = await response.json();
      setTestResults(prev => [...prev, {
        timestamp: new Date().toISOString(),
        action: 'Check Badges',
        result,
        success: true
      }]);

      toast({
        title: "Badge Check Complete",
        description: `Found ${result.newBadges?.length || 0} new badges`,
      });
    } catch (error) {
      console.error('Error checking badges:', error);
      setTestResults(prev => [...prev, {
        timestamp: new Date().toISOString(),
        action: 'Check Badges',
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      }]);

      toast({
        title: "Error",
        description: "Failed to check badges",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const testTransaction = async () => {
    setLoading(true);
    try {
      // Simulate a financial transaction
      const transactionAmount = Math.random() * 50 + 5; // Random amount between 5-55
      const xpAmount = transactionAmount >= 10 ? 15 : 10;

      const response = await fetch('/api/xp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: testUserId,
          action: 'transaction_complete',
          xpAmount,
          hubType: 'finance',
          metadata: { 
            amount: transactionAmount,
            type: 'send',
            test: true 
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to process transaction: ${response.statusText}`);
      }

      const result = await response.json();
      setTestResults(prev => [...prev, {
        timestamp: new Date().toISOString(),
        action: 'Test Transaction',
        result: { ...result, transactionAmount },
        success: true
      }]);

      toast({
        title: "Transaction Complete!",
        description: `Sent $${transactionAmount.toFixed(2)} and earned ${xpAmount} XP`,
      });
    } catch (error) {
      console.error('Error processing transaction:', error);
      setTestResults(prev => [...prev, {
        timestamp: new Date().toISOString(),
        action: 'Test Transaction',
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      }]);

      toast({
        title: "Error",
        description: "Failed to process transaction",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">XP System Test Page</h1>
        <p className="text-muted-foreground mt-2">
          Test and verify XP system functionality
        </p>
      </div>

      <Tabs defaultValue="components" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="components">Components</TabsTrigger>
          <TabsTrigger value="testing">Testing</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>

        <TabsContent value="components" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>XP Display Component</CardTitle>
                <CardDescription>
                  Test the XP display with realtime updates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <XPDisplay
                  userId={testUserId}
                  showDetails={true}
                  onXPUpdate={handleXPUpdate}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Badge Display Component</CardTitle>
                <CardDescription>
                  View user badges and achievements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BadgeDisplay userId={testUserId} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="testing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>XP System Testing</CardTitle>
              <CardDescription>
                Test XP awarding, badge unlocking, and other functionality
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="userId">Test User ID</Label>
                  <Input
                    id="userId"
                    value={testUserId}
                    onChange={(e) => setTestUserId(e.target.value)}
                    placeholder="Enter user ID"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="xpAmount">XP Amount</Label>
                  <Input
                    id="xpAmount"
                    type="number"
                    value={xpAmount}
                    onChange={(e) => setXpAmount(parseInt(e.target.value) || 0)}
                    placeholder="Enter XP amount"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="action">Action</Label>
                  <Select value={action} onValueChange={setAction}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="test_action">Test Action</SelectItem>
                      <SelectItem value="daily_login">Daily Login</SelectItem>
                      <SelectItem value="study_material_upload">Study Material Upload</SelectItem>
                      <SelectItem value="quiz_completion">Quiz Completion</SelectItem>
                      <SelectItem value="transaction_complete">Transaction Complete</SelectItem>
                      <SelectItem value="club_join">Club Join</SelectItem>
                      <SelectItem value="event_attendance">Event Attendance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hubType">Hub Type</Label>
                  <Select value={hubType} onValueChange={setHubType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select hub type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="campus">Campus</SelectItem>
                      <SelectItem value="learning">Learning</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="club">Club</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={awardXP} disabled={loading}>
                  Award XP
                </Button>
                <Button onClick={checkBadges} disabled={loading} variant="outline">
                  Check Badges
                </Button>
                <Button onClick={testTransaction} disabled={loading} variant="outline">
                  Test Transaction
                </Button>
                <Button onClick={clearResults} variant="ghost">
                  Clear Results
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leaderboard">
          <Card>
            <CardHeader>
              <CardTitle>Leaderboard</CardTitle>
              <CardDescription>
                View the current leaderboard with realtime updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LeaderboardPage />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results">
          <Card>
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
              <CardDescription>
                View the results of your tests
              </CardDescription>
            </CardHeader>
            <CardContent>
              {testResults.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No test results yet. Run some tests to see results here.
                </p>
              ) : (
                <div className="space-y-4">
                  {testResults.map((result, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border ${
                        result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant={result.success ? 'default' : 'destructive'}>
                          {result.action}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {new Date(result.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      
                      {result.success ? (
                        <pre className="text-sm bg-white p-2 rounded border overflow-auto">
                          {JSON.stringify(result.result, null, 2)}
                        </pre>
                      ) : (
                        <p className="text-red-600 text-sm">{result.error}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}