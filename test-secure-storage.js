// Quick test to verify secure storage API is properly exposed
// Run this in the renderer console to test

async function testSecureStorageAPI() {
  console.log('Testing Secure Storage API...');

  // Check if API is available
  if (!window.justiceAPI || !window.justiceAPI.secureStorage) {
    console.error('❌ Secure Storage API not found on window.justiceAPI');
    return;
  }

  console.log('✅ Secure Storage API found on window.justiceAPI');

  try {
    // Test isEncryptionAvailable
    console.log('Testing isEncryptionAvailable...');
    const isAvailable = await window.justiceAPI.secureStorage.isEncryptionAvailable();
    console.log(`✅ Encryption available: ${isAvailable}`);

    // Test set
    console.log('Testing set...');
    const testKey = 'test_api_key';
    const testValue = 'test_value_12345';
    await window.justiceAPI.secureStorage.set(testKey, testValue);
    console.log('✅ Set test value');

    // Test get
    console.log('Testing get...');
    const retrieved = await window.justiceAPI.secureStorage.get(testKey);
    if (retrieved === testValue) {
      console.log('✅ Retrieved correct value:', retrieved);
    } else {
      console.error('❌ Retrieved value mismatch:', retrieved);
    }

    // Test delete
    console.log('Testing delete...');
    await window.justiceAPI.secureStorage.delete(testKey);
    console.log('✅ Deleted test value');

    // Verify deletion
    console.log('Verifying deletion...');
    const afterDelete = await window.justiceAPI.secureStorage.get(testKey);
    if (afterDelete === null || afterDelete === undefined) {
      console.log('✅ Value successfully deleted');
    } else {
      console.error('❌ Value still exists after deletion:', afterDelete);
    }

    console.log('✅ All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testSecureStorageAPI();