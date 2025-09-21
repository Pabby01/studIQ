/**
 * XP System Test Script
 * This script tests all aspects of the XP system including:
 * - XP awarding API endpoints
 * - Badge unlocking logic
 * - Leaderboard functionality
 * - Database operations
 * - Component integration
 */

const { createClient } = require('@supabase/supabase-js');

// Test configuration
const TEST_CONFIG = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  testUserId: 'user1-test-id',
  apiBaseUrl: 'https://stud-iq-nine.vercel.app/api'
};

// Initialize Supabase client
const supabase = createClient(TEST_CONFIG.supabaseUrl, TEST_CONFIG.supabaseKey);

// Test utilities
const log = (message, data = null) => {
  console.log(`[${new Date().toISOString()}] ${message}`);
  if (data) console.log(JSON.stringify(data, null, 2));
};

const error = (message, err = null) => {
  console.error(`[${new Date().toISOString()}] ERROR: ${message}`);
  if (err) console.error(err);
};

const success = (message) => {
  console.log(`[${new Date().toISOString()}] ✅ ${message}`);
};

const fail = (message) => {
  console.log(`[${new Date().toISOString()}] ❌ ${message}`);
};

// Test functions
async function testDatabaseConnection() {
  log('Testing database connection...');
  try {
    const { data, error: dbError } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (dbError) throw dbError;
    success('Database connection successful');
    return true;
  } catch (err) {
    error('Database connection failed', err);
    return false;
  }
}

async function testXPAwarding() {
  log('Testing XP awarding functionality...');
  
  try {
    // Get initial XP
    const { data: initialXP } = await supabase
      .from('user_xp')
      .select('*')
      .eq('user_id', TEST_CONFIG.testUserId)
      .single();
    
    log('Initial XP:', initialXP);
    
    // Test XP API endpoint
    const response = await fetch(`${TEST_CONFIG.apiBaseUrl}/xp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer test-token`
      },
      body: JSON.stringify({
        userId: TEST_CONFIG.testUserId,
        action: 'test_action',
        xpAmount: 25,
        hubType: 'campus',
        metadata: { test: true }
      })
    });
    
    if (!response.ok) {
      throw new Error(`XP API returned ${response.status}: ${await response.text()}`);
    }
    
    const result = await response.json();
    log('XP API response:', result);
    
    // Verify XP was awarded
    const { data: updatedXP } = await supabase
      .from('user_xp')
      .select('*')
      .eq('user_id', TEST_CONFIG.testUserId)
      .single();
    
    log('Updated XP:', updatedXP);
    
    if (updatedXP.total_xp > initialXP.total_xp) {
      success('XP awarding test passed');
      return true;
    } else {
      fail('XP was not properly awarded');
      return false;
    }
  } catch (err) {
    error('XP awarding test failed', err);
    return false;
  }
}

async function testBadgeUnlocking() {
  log('Testing badge unlocking functionality...');
  
  try {
    // Get available badges
    const { data: badges } = await supabase
      .from('badges')
      .select('*')
      .order('xp_requirement', { ascending: true });
    
    log(`Found ${badges.length} badges`);
    
    // Get user's current badges
    const { data: userBadges } = await supabase
      .from('user_badges')
      .select('badge_id')
      .eq('user_id', TEST_CONFIG.testUserId);
    
    const unlockedBadgeIds = userBadges.map(ub => ub.badge_id);
    log(`User has ${unlockedBadgeIds.length} badges unlocked`);
    
    // Test badge API endpoint
    const response = await fetch(`${TEST_CONFIG.apiBaseUrl}/badges/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer test-token`
      },
      body: JSON.stringify({
        userId: TEST_CONFIG.testUserId
      })
    });
    
    if (!response.ok) {
      throw new Error(`Badge API returned ${response.status}: ${await response.text()}`);
    }
    
    const badgeResult = await response.json();
    log('Badge check result:', badgeResult);
    
    success('Badge unlocking test completed');
    return true;
  } catch (err) {
    error('Badge unlocking test failed', err);
    return false;
  }
}

async function testLeaderboard() {
  log('Testing leaderboard functionality...');
  
  try {
    // Test leaderboard API
    const response = await fetch(`${TEST_CONFIG.apiBaseUrl}/leaderboard?limit=10`);
    
    if (!response.ok) {
      throw new Error(`Leaderboard API returned ${response.status}: ${await response.text()}`);
    }
    
    const leaderboard = await response.json();
    log(`Leaderboard returned ${leaderboard.length} entries`);
    
    // Verify leaderboard is sorted by total XP
    for (let i = 1; i < leaderboard.length; i++) {
      if (leaderboard[i].total_xp > leaderboard[i-1].total_xp) {
        fail('Leaderboard is not properly sorted');
        return false;
      }
    }
    
    success('Leaderboard test passed');
    return true;
  } catch (err) {
    error('Leaderboard test failed', err);
    return false;
  }
}

async function testXPCalculation() {
  log('Testing XP calculation logic...');
  
  try {
    // Test different XP calculation scenarios
    const testCases = [
      { action: 'daily_login', expected: 10 },
      { action: 'study_material_upload', expected: 25 },
      { action: 'quiz_completion', metadata: { score: 85 }, expected: 35 },
      { action: 'quiz_completion', metadata: { score: 95 }, expected: 50 },
      { action: 'transaction_complete', metadata: { amount: 5 }, expected: 10 },
      { action: 'transaction_complete', metadata: { amount: 15 }, expected: 15 }
    ];
    
    for (const testCase of testCases) {
      const response = await fetch(`${TEST_CONFIG.apiBaseUrl}/xp/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: testCase.action,
          metadata: testCase.metadata || {}
        })
      });
      
      if (!response.ok) {
        throw new Error(`XP calculation API returned ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.xpAmount !== testCase.expected) {
        fail(`XP calculation failed for ${testCase.action}: expected ${testCase.expected}, got ${result.xpAmount}`);
        return false;
      }
    }
    
    success('XP calculation test passed');
    return true;
  } catch (err) {
    error('XP calculation test failed', err);
    return false;
  }
}

async function testRealtimeSubscriptions() {
  log('Testing realtime subscriptions...');
  
  try {
    let receivedUpdate = false;
    
    // Subscribe to XP updates
    const subscription = supabase
      .channel('xp-test')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'user_xp',
        filter: `user_id=eq.${TEST_CONFIG.testUserId}`
      }, (payload) => {
        log('Received realtime XP update:', payload);
        receivedUpdate = true;
      })
      .subscribe();
    
    // Wait for subscription to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Trigger an XP update
    await fetch(`${TEST_CONFIG.apiBaseUrl}/xp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer test-token`
      },
      body: JSON.stringify({
        userId: TEST_CONFIG.testUserId,
        action: 'realtime_test',
        xpAmount: 5,
        hubType: 'campus',
        metadata: { realtime_test: true }
      })
    });
    
    // Wait for realtime update
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Cleanup subscription
    await supabase.removeChannel(subscription);
    
    if (receivedUpdate) {
      success('Realtime subscriptions test passed');
      return true;
    } else {
      fail('No realtime update received');
      return false;
    }
  } catch (err) {
    error('Realtime subscriptions test failed', err);
    return false;
  }
}

async function testLevelProgression() {
  log('Testing level progression...');
  
  try {
    // Get current user XP
    const { data: userXP } = await supabase
      .from('user_xp')
      .select('total_xp')
      .eq('user_id', TEST_CONFIG.testUserId)
      .single();
    
    const currentLevel = Math.floor(userXP.total_xp / 100) + 1;
    const currentProgress = userXP.total_xp % 100;
    const nextLevelXP = currentLevel * 100;
    
    log(`Current level: ${currentLevel}, Progress: ${currentProgress}/100, Next level at: ${nextLevelXP} XP`);
    
    // Test level calculation API
    const response = await fetch(`${TEST_CONFIG.apiBaseUrl}/xp/level?userId=${TEST_CONFIG.testUserId}`);
    
    if (!response.ok) {
      throw new Error(`Level API returned ${response.status}`);
    }
    
    const levelData = await response.json();
    log('Level API response:', levelData);
    
    if (levelData.level === currentLevel && levelData.progress === currentProgress) {
      success('Level progression test passed');
      return true;
    } else {
      fail('Level calculation mismatch');
      return false;
    }
  } catch (err) {
    error('Level progression test failed', err);
    return false;
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting XP System Tests\n');
  
  const tests = [
    { name: 'Database Connection', fn: testDatabaseConnection },
    { name: 'XP Awarding', fn: testXPAwarding },
    { name: 'Badge Unlocking', fn: testBadgeUnlocking },
    { name: 'Leaderboard', fn: testLeaderboard },
    { name: 'XP Calculation', fn: testXPCalculation },
    { name: 'Level Progression', fn: testLevelProgression },
    { name: 'Realtime Subscriptions', fn: testRealtimeSubscriptions }
  ];
  
  const results = [];
  
  for (const test of tests) {
    console.log(`\n📋 Running ${test.name} test...`);
    const result = await test.fn();
    results.push({ name: test.name, passed: result });
    console.log(`${result ? '✅' : '❌'} ${test.name} test ${result ? 'PASSED' : 'FAILED'}`);
  }
  
  // Summary
  console.log('\n📊 Test Summary:');
  console.log('================');
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  results.forEach(result => {
    console.log(`${result.passed ? '✅' : '❌'} ${result.name}`);
  });
  
  console.log(`\nTotal: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! XP system is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please check the logs above.');
  }
  
  return passed === total;
}

// Export for use in other scripts
module.exports = {
  runAllTests,
  testDatabaseConnection,
  testXPAwarding,
  testBadgeUnlocking,
  testLeaderboard,
  testXPCalculation,
  testRealtimeSubscriptions,
  testLevelProgression
};

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(err => {
    error('Test runner failed', err);
    process.exit(1);
  });
}