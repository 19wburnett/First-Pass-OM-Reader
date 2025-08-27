# CRE First-Pass Underwriting App

An AI-powered Next.js application that performs first-pass underwriting analysis on Commercial Real Estate (CRE) Offering Memorandums (OMs).

## Features

- **PDF Upload & Processing**: Drag-and-drop PDF upload with text extraction
- **AI Analysis**: Uses OpenAI GPT-4o-mini to extract key property metrics from OM text
- **Automated Underwriting**: Calculates pro forma metrics, returns, and valuations
- **Clean UI**: Modern, responsive interface built with Tailwind CSS
- **Serverless**: Ready for deployment on Vercel

## Key Metrics Calculated

- **Purchase Price & Units/SF**
- **Average Rent & Occupancy**
- **NOI & Operating Expenses**
- **DSCR (Debt Service Coverage Ratio)**
- **Cash-on-Cash Return**
- **5-Year IRR (simplified model)**
- **Cap Rate Valuation**

## Default Assumptions

- **Vacancy**: 5%
- **Expense Ratio**: 35% of Effective Gross Income
- **Market Cap Rate**: 6%
- **Loan**: 65% LTV, 6% interest, 30-year amortization
- **Rent Growth**: 3% annually
- **Expense Growth**: 2% annually
- **Exit Cap Rate**: 6.5% (50bps above market)

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS
- **PDF Processing**: pdf-parse
- **AI Analysis**: OpenAI GPT-4o-mini
- **Deployment**: Vercel (serverless)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Setup

Create a `.env.local` file in the root directory:

```bash
# OpenAI API Key - Get yours at https://platform.openai.com/api-keys
OPENAI_API_KEY=your_openai_api_key_here
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Upload and Analyze

1. Upload a PDF Offering Memorandum
2. Wait for AI analysis (typically 10-30 seconds)
3. Review the comprehensive underwriting summary

## Project Structure

```
├── app/
│   ├── api/parseOM/route.ts    # PDF processing API
│   ├── components/
│   │   ├── FileUpload.tsx      # PDF upload component
│   │   └── DealSummary.tsx     # Results display component
│   ├── globals.css             # Tailwind CSS
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Main page
│   └── types.ts                # TypeScript interfaces
├── package.json
├── next.config.js
├── tailwind.config.js
└── README.md
```

## API Endpoint

### POST `/api/parseOM`

Accepts a PDF file and returns structured underwriting data.

**Request**: FormData with `pdf` field containing the PDF file

**Response**: JSON object with complete deal analysis

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically

### Environment Variables for Production

- `OPENAI_API_KEY`: Your OpenAI API key

## Customization

### Underwriting Assumptions

Modify the `DEFAULT_ASSUMPTIONS` object in `app/api/parseOM/route.ts` to adjust:

- Vacancy rates
- Expense ratios
- Market cap rates
- Financing terms
- Growth assumptions

### AI Prompt

Customize the OpenAI prompt in the `analyzeWithOpenAI` function to extract different metrics or use different analysis approaches.

## Limitations

- **PDF Quality**: Text extraction works best with searchable PDFs
- **AI Accuracy**: Results depend on the quality and clarity of the OM document
- **Simplified IRR**: 5-year IRR calculation is a simplified approximation
- **File Size**: Large PDFs may take longer to process

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues or questions:
1. Check the existing GitHub issues
2. Create a new issue with detailed information
3. Include the PDF file type and any error messages

---

**Note**: This application is for educational and analysis purposes. Always verify calculations and consult with qualified professionals for actual investment decisions.
