const fetch = require('node-fetch');

async function testForgotPassword() {
  try {
    const response = await fetch('http://localhost:3000/api/auth/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'pabbyinitiative@gmail.com'
      })
    });

    const data = await response.json();
    console.log('Response:', {
      status: response.status,
      data
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

testForgotPassword();