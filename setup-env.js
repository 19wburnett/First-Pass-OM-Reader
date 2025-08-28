#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');
const envExample = `# OpenAI API Key - Get yours at https://platform.openai.com/api-keys
OPENAI_API_KEY=your_openai_api_key_here

# Supabase Configuration - Get yours at https://supabase.com
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

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
  console.log('⚠️  Please add your API keys to .env.local');
}

console.log('\n📋 Next steps:');
console.log('1. Set up Supabase project at https://supabase.com');
console.log('2. Create a storage bucket named "om-files"');
console.log('3. Create a table named "file_uploads" with the schema from the README');
console.log('4. Add your OpenAI API key to .env.local');
console.log('5. Add your Supabase URL and anon key to .env.local');
console.log('6. Run: npm install');
console.log('7. Run: npm run dev');
console.log('8. Open http://localhost:3000\n');

console.log('🔑 Get your OpenAI API key at: https://platform.openai.com/api-keys');
console.log('🔑 Get your Supabase credentials at: https://supabase.com/dashboard');
console.log('\n📚 See README.md for detailed Supabase setup instructions');
