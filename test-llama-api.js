#!/usr/bin/env node

/**
 * Test script for Llama API connection
 * Usage: node test-llama-api.js [API_URL]
 */

const fetch = require('node-fetch');

const API_URL = process.argv[2] || process.env.REACT_APP_LLAMA_API_URL || 'http://localhost:8000';

const testPrompts = [
  {
    prompt: "Create a work order for motor bearing replacement",
    context: "Manufacturing equipment maintenance",
    expected: "Should return work order details"
  },
  {
    prompt: "Parse this voice command: replace air filter on HVAC unit 3, high priority",
    context: "Voice work order creation",
    expected: "Should extract structured data"
  },
  {
    prompt: "Work completed: replaced pump seal, tested system, 2 hours total",
    context: "Work order completion",
    expected: "Should generate completion summary"
  }
];

async function testLlamaAPI(apiUrl) {
  console.log(`🔍 Testing Llama API at: ${apiUrl}`);
  console.log('=' * 50);

  // Test different possible endpoint formats
  const endpoints = [
    '/chat',
    '/api/chat',
    '/v1/chat/completions',
    '/api/v1/chat',
    '/generate'
  ];

  for (const endpoint of endpoints) {
    const fullUrl = `${apiUrl}${endpoint}`;
    console.log(`\n📡 Testing endpoint: ${fullUrl}`);
    
    try {
      // Test with basic request
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          prompt: "Hello, can you help with maintenance tasks?",
          context: "Testing API connection",
          max_tokens: 100,
          temperature: 0.7
        }),
        timeout: 10000
      });

      console.log(`   Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ SUCCESS! Response received:`);
        console.log(`   Response keys: ${Object.keys(data).join(', ')}`);
        
        // Extract response content
        const content = data.response || data.content || data.message || data.text || JSON.stringify(data);
        console.log(`   Content preview: ${content.substring(0, 100)}...`);
        
        // Test with maintenance-specific prompts
        console.log(`\n🔧 Testing maintenance prompts on ${endpoint}:`);
        
        for (const test of testPrompts) {
          try {
            const testResponse = await fetch(fullUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              body: JSON.stringify({
                prompt: test.prompt,
                context: test.context,
                max_tokens: 300,
                temperature: 0.7
              }),
              timeout: 15000
            });

            if (testResponse.ok) {
              const testData = await testResponse.json();
              const testContent = testData.response || testData.content || testData.message || testData.text;
              console.log(`   ✅ "${test.prompt.substring(0, 40)}..." → Success`);
              console.log(`      Response: ${testContent.substring(0, 100)}...`);
            } else {
              console.log(`   ❌ "${test.prompt.substring(0, 40)}..." → Failed (${testResponse.status})`);
            }
          } catch (error) {
            console.log(`   ❌ "${test.prompt.substring(0, 40)}..." → Error: ${error.message}`);
          }
        }
        
        return { endpoint, success: true, data };
      } else {
        const errorText = await response.text().catch(() => 'No error details');
        console.log(`   ❌ Failed: ${errorText.substring(0, 200)}`);
      }

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  console.log(`\n❌ No working endpoints found at ${apiUrl}`);
  return { success: false };
}

// Test different request formats
async function testRequestFormats(apiUrl, workingEndpoint) {
  console.log(`\n🧪 Testing different request formats for ${apiUrl}${workingEndpoint}`);
  
  const formats = [
    // Standard format
    {
      name: "Standard",
      body: {
        prompt: "Test maintenance prompt",
        context: "Testing format",
        max_tokens: 100
      }
    },
    // OpenAI-style format
    {
      name: "OpenAI-style",
      body: {
        messages: [
          { role: "system", content: "You are a maintenance assistant" },
          { role: "user", content: "Test maintenance prompt" }
        ],
        max_tokens: 100,
        temperature: 0.7
      }
    },
    // Simple format
    {
      name: "Simple",
      body: {
        text: "Test maintenance prompt",
        max_length: 100
      }
    }
  ];

  for (const format of formats) {
    try {
      const response = await fetch(`${apiUrl}${workingEndpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(format.body),
        timeout: 10000
      });

      if (response.ok) {
        console.log(`   ✅ ${format.name} format works`);
      } else {
        console.log(`   ❌ ${format.name} format failed (${response.status})`);
      }
    } catch (error) {
      console.log(`   ❌ ${format.name} format error: ${error.message}`);
    }
  }
}

// Main execution
async function main() {
  if (!API_URL || API_URL === 'http://localhost:8000') {
    console.log('⚠️  No API URL provided. Usage:');
    console.log('   node test-llama-api.js https://your-llama-api.com');
    console.log('   Or set REACT_APP_LLAMA_API_URL environment variable');
    process.exit(1);
  }

  try {
    const result = await testLlamaAPI(API_URL);
    
    if (result.success) {
      console.log(`\n🎉 SUCCESS! Your Llama API is working!`);
      console.log(`\n📋 Configuration for ChatterFix:`);
      console.log(`   Add to .env.local:`);
      console.log(`   REACT_APP_LLAMA_API_URL=${API_URL}`);
      
      if (result.endpoint) {
        await testRequestFormats(API_URL, result.endpoint);
      }
      
      console.log(`\n🚀 Ready to integrate with ChatterFix CMMS!`);
    } else {
      console.log(`\n❌ Could not connect to Llama API`);
      console.log(`\n🔧 Troubleshooting tips:`);
      console.log(`   1. Check if the API URL is correct and accessible`);
      console.log(`   2. Verify the API is running and responding`);
      console.log(`   3. Check if authentication is required`);
      console.log(`   4. Try testing with curl: curl -X POST ${API_URL}/chat -H "Content-Type: application/json" -d '{"prompt":"test"}'`);
    }
  } catch (error) {
    console.log(`\n💥 Fatal error: ${error.message}`);
  }
}

if (require.main === module) {
  main();
}

module.exports = { testLlamaAPI };