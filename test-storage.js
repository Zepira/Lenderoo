// Quick test for AsyncStorage
// Run this if you want to verify AsyncStorage works

import AsyncStorage from '@react-native-async-storage/async-storage';

async function testStorage() {
  try {
    await AsyncStorage.setItem('test-key', 'test-value');
    const value = await AsyncStorage.getItem('test-key');
    console.log('✅ AsyncStorage works! Value:', value);
    await AsyncStorage.removeItem('test-key');
  } catch (error) {
    console.error('❌ AsyncStorage error:', error);
  }
}

testStorage();
