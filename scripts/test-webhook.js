// Test webhook script - simulates n8n sending a webhook
// Run with: node scripts/test-webhook.js

const https = require('https');

const webhookData = {
  email: 'test-webhook@example.com',
  payload: {
    email: 'test-webhook@example.com',
    tier: 'Launch',
    budget_range: '$4,000-$5,500 CAD'
  },
  response: {
    tier: 'Launch',
    pricing: '$4,500 CAD',
    timeline: '6-8 weeks',
    deliverables: [
      'SKU Planning & Product Definition',
      'Supplier Sourcing & Coordination',
      'Design Coordination',
      'Sample Approval & Quality Check',
      'Production Oversight',
      'Logistics & Fulfillment Setup',
      'Launch Support'
    ],
    proposal_markdown: '# Test Proposal\n\nThis is a test proposal generated via webhook.'
  }
};

const data = JSON.stringify(webhookData);

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/webhooks/proposal',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
    // Optional: Add webhook secret if configured
    // 'X-Webhook-Secret': 'your-secret-here'
  }
};

console.log('🚀 Sending test webhook to dashboard...');
console.log('Agent: proposal');
console.log('Email:', webhookData.email);
console.log('');

const req = https.request(options, (res) => {
  let response = '';

  res.on('data', (chunk) => {
    response += chunk;
  });

  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);

    try {
      const parsed = JSON.parse(response);
      console.log('Response:', JSON.stringify(parsed, null, 2));

      if (parsed.success) {
        console.log('');
        console.log('✅ Webhook sent successfully!');
        console.log('📊 Approval ID:', parsed.approval_id);
        console.log('');
        console.log('🎯 Check your dashboard at http://localhost:3000/dashboard');
        console.log('   You should see a new pending approval for test-webhook@example.com');
      } else {
        console.log('');
        console.log('❌ Webhook failed:', parsed.error);
      }
    } catch (e) {
      console.log('Raw response:', response);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error sending webhook:', error.message);
  console.log('');
  console.log('💡 Make sure the dev server is running:');
  console.log('   cd dashboard && npm run dev');
});

req.write(data);
req.end();
