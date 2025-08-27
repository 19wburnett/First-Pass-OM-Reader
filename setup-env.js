#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');
const envExample = `# OpenAI API Key - Get yours at https://platform.openai.com/api-keys
OPENAI_API_KEY=your_openai_api_key_here

# Optional: Customize underwriting assumptions
# VACANCY_RATE=0.05
# EXPENSE_RATIO=0.35
# MARKET_CAP_RATE=0.06
# LOAN_TO_VALUE=0.65
# INTEREST_RATE=0.06
`;

console.log('🚀 Setting up CRE Underwriting App...\n');

if (fs.existsSync(envPath)) {
  console.log('✅ .env.local already exists');
} else {
  fs.writeFileSync(envPath, envExample);
  console.log('✅ Created .env.local file');
  console.log('⚠️  Please add your OpenAI API key to .env.local');
}

console.log('\n📋 Next steps:');
console.log('1. Add your OpenAI API key to .env.local');
console.log('2. Run: npm install');
console.log('3. Run: npm run dev');
console.log('4. Open http://localhost:3000\n');

console.log('🔑 Get your OpenAI API key at: https://platform.openai.com/api-keys');
