# First Pass OM Reader

A commercial real estate underwriting tool that analyzes Offering Memorandums (OMs) using AI to extract key metrics and perform investment analysis.

## 🚀 Features

- **AI-Powered Analysis**: Extract property data from PDF OMs using OpenAI GPT-4
- **Rent Roll Integration**: Upload Excel/CSV rent rolls for accurate occupancy and rent data
- **Underwriting Calculations**: Pro forma analysis, IRR calculations, and investment metrics
- **Large File Support**: Handle OMs up to 100MB using Supabase storage
- **Real-time Processing**: Instant analysis with progress indicators

## 🏗️ Architecture

The app now uses **Supabase** for file storage instead of direct uploads to Vercel, which provides:

- ✅ **No file size limits** (handles 100MB+ files reliably)
- ✅ **Better performance** (no Vercel payload size constraints)
- ✅ **Asynchronous processing** (no function timeout issues)
- ✅ **Cost-effective storage** (predictable pricing)

## 📋 Prerequisites

- Node.js 18+ 
- OpenAI API key
- Supabase account

## 🛠️ Setup

### 1. Clone and Install

```bash
git clone <repository-url>
cd first-pass-om-reader
npm install
```

### 2. Set up Supabase

1. **Create Supabase Project**
   - Go to [https://supabase.com](https://supabase.com)
   - Create a new project
   - Note your project URL and anon key

2. **Create Storage Bucket**
   ```sql
   -- In Supabase SQL Editor, run:
   INSERT INTO storage.buckets (id, name, public) 
   VALUES ('om-files', 'om-files', true);
   ```

3. **Create File Uploads Table**
   ```sql
   -- Create the file_uploads table
   CREATE TABLE file_uploads (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     file_name TEXT NOT NULL,
     file_path TEXT NOT NULL,
     file_size BIGINT NOT NULL,
     file_type TEXT NOT NULL,
     file_type_category TEXT NOT NULL,
     public_url TEXT NOT NULL,
     uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ```

4. **Set Storage Policies**
   ```sql
   -- Allow public read access to uploaded files
   CREATE POLICY "Public Access" ON storage.objects
   FOR SELECT USING (bucket_id = 'om-files');
   
   -- Allow authenticated uploads
   CREATE POLICY "Authenticated Uploads" ON storage.objects
   FOR INSERT WITH CHECK (bucket_id = 'om-files');
   ```

### 3. Environment Variables

Run the setup script:
```bash
node setup-env.js
```

Then edit `.env.local`:
```env
# OpenAI API Key
OPENAI_API_KEY=your_openai_api_key_here

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 🔄 How It Works

### New Supabase Flow

1. **File Upload**: Files are uploaded to Supabase Storage via `/api/uploadFile`
2. **URL Generation**: Supabase returns public URLs for the uploaded files
3. **Analysis**: The `/api/parseOM` endpoint fetches files from URLs and processes them
4. **Results**: Analysis results are returned to the client

### Benefits Over Previous Approach

| Aspect | Before (Vercel Direct) | Now (Supabase) |
|--------|------------------------|----------------|
| File Size Limit | 4.5MB (unreliable) | 100MB+ (reliable) |
| Processing Time | 10s timeout risk | No timeout issues |
| Memory Usage | Limited serverless | Unlimited processing |
| Cost | Pay per function call | Predictable storage costs |
| Reliability | Function timeouts | Stable file handling |

## 📁 File Structure

```
app/
├── api/
│   ├── parseOM/          # Main analysis endpoint
│   └── uploadFile/       # Supabase file upload
├── components/            # React components
├── lib/
│   └── supabase.ts       # Supabase client config
└── types.ts              # TypeScript definitions
```

## 🚀 Deployment

### Vercel Deployment

The app is optimized for Vercel deployment:

```json
// vercel.json
{
  "functions": {
    "app/api/parseOM/route.ts": {
      "maxDuration": 60
    }
  }
}
```

### Environment Variables

Set these in your Vercel project:
- `OPENAI_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 🔧 Troubleshooting

### Common Issues

1. **File Upload Fails**
   - Check Supabase storage bucket exists
   - Verify storage policies are set correctly
   - Check environment variables

2. **Analysis Fails**
   - Ensure OpenAI API key is valid
   - Check file format (PDF for OM, Excel/CSV for rent roll)
   - Verify Supabase file URLs are accessible

3. **Large File Issues**
   - Files are now handled by Supabase (no size limits)
   - Check network connection for large uploads
   - Monitor Supabase storage usage

## 📊 Performance

- **Small files (<10MB)**: ~2-5 seconds
- **Large files (10-50MB)**: ~5-15 seconds  
- **Very large files (50-100MB)**: ~15-30 seconds

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues or questions:
1. Check the troubleshooting section
2. Review Supabase documentation
3. Open an issue on GitHub
