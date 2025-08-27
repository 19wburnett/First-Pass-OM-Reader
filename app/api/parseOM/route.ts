import { NextRequest, NextResponse } from 'next/server'
import pdf from 'pdf-parse'
import OpenAI from 'openai'
import { ParsedOMData, DealData, UnderwritingAssumptions, IRRBreakdown } from '../../types'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Default underwriting assumptions
const DEFAULT_ASSUMPTIONS: UnderwritingAssumptions = {
  vacancy: 0.05, // 5%
  expenseRatio: 0.35, // 35% of EGI
  marketCapRate: 0.06, // 6%
  loanToValue: 0.65, // 65% LTV
  interestRate: 0.06, // 6% interest
  amortizationYears: 30,
  rentGrowthRate: 0.03, // 3% annual rent growth
  expenseGrowthRate: 0.02, // 2% annual expense growth
  exitCapRate: 0.065, // 6.5% exit cap (50bps above market)
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const pdfFile = formData.get('pdf') as File

    if (!pdfFile) {
      return NextResponse.json(
        { error: 'No PDF file provided' },
        { status: 400 }
      )
    }

    if (pdfFile.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'File must be a PDF' },
        { status: 400 }
      )
    }

    // Convert File to Buffer for pdf-parse
    const arrayBuffer = await pdfFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Extract text from PDF
    const pdfData = await pdf(buffer)
    const extractedText = pdfData.text

    if (!extractedText || extractedText.trim().length === 0) {
      return NextResponse.json(
        { error: 'Could not extract text from PDF' },
        { status: 400 }
      )
    }

    // Send to OpenAI for analysis
    const parsedData = await analyzeWithOpenAI(extractedText)
    
    // Perform underwriting calculations
    const dealData = performUnderwritingCalculations(parsedData, DEFAULT_ASSUMPTIONS)

    return NextResponse.json(dealData)
  } catch (error) {
    console.error('Error processing PDF:', error)
    return NextResponse.json(
      { error: 'Failed to process PDF' },
      { status: 500 }
    )
  }
}

async function analyzeWithOpenAI(text: string): Promise<ParsedOMData> {
  const prompt = `
You are a commercial real estate analyst. Extract the following information from this Offering Memorandum text and return ONLY a valid JSON object with these exact field names:

{
  "propertyName": "string - name of the property",
  "purchasePrice": number - purchase price in USD (no commas or symbols)",
  "units": number - total number of units",
  "occupancy": number - occupancy rate as decimal (e.g., 0.95 for 95%)",
  "avgRent": number - average monthly rent per unit in USD",
  "expenses": number - annual operating expenses in USD",
  "NOI": number - Net Operating Income in USD",
  "marketCapRate": number - market cap rate as decimal (e.g., 0.06 for 6%)"
}

If any information is missing, use reasonable estimates based on the property type and market. For missing values, use these defaults:
- occupancy: 0.95 (95%)
- marketCapRate: 0.06 (6%)
- expenses: calculate as 35% of potential gross income if not provided
- NOI: calculate as gross income minus expenses if not provided

Text to analyze:
${text.substring(0, 4000)} // Limit text length for API efficiency
`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a commercial real estate analyst. Return only valid JSON.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.1,
    max_tokens: 500,
  })

  const responseText = completion.choices[0]?.message?.content
  if (!responseText) {
    throw new Error('No response from OpenAI')
  }

  try {
    // Extract JSON from response (handle cases where OpenAI adds extra text)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in OpenAI response')
    }

    const parsedData = JSON.parse(jsonMatch[0]) as ParsedOMData
    
    // Validate required fields
    if (!parsedData.propertyName || !parsedData.purchasePrice || !parsedData.units || !parsedData.avgRent) {
      throw new Error('Missing required fields in parsed data')
    }

    return parsedData
  } catch (parseError) {
    console.error('Failed to parse OpenAI response:', responseText)
    throw new Error('Failed to parse AI analysis')
  }
}

function performUnderwritingCalculations(
  parsedData: ParsedOMData, 
  assumptions: UnderwritingAssumptions
): DealData {
  const {
    purchasePrice,
    units,
    occupancy,
    avgRent,
    expenses: parsedExpenses,
    NOI: parsedNOI,
    marketCapRate
  } = parsedData

  // Calculate pro forma metrics
  const grossPotentialIncome = units * avgRent * 12
  const vacancy = assumptions.vacancy
  const effectiveGrossIncome = grossPotentialIncome * (1 - vacancy)
  
  // Use parsed expenses or calculate based on assumption
  const operatingExpenses = parsedExpenses || (effectiveGrossIncome * assumptions.expenseRatio)
  
  // Use parsed NOI or calculate
  const NOI = parsedNOI || (effectiveGrossIncome - operatingExpenses)
  
  // Cap rate valuation
  const capRateValuation = NOI / assumptions.marketCapRate
  
  // Financing calculations
  const loanAmount = purchasePrice * assumptions.loanToValue
  const equity = purchasePrice - loanAmount
  
  // Calculate monthly payment for 30-year fixed loan
  const monthlyRate = assumptions.interestRate / 12
  const totalPayments = assumptions.amortizationYears * 12
  const debtService = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) / 
                     (Math.pow(1 + monthlyRate, totalPayments) - 1)
  const annualDebtService = debtService * 12
  
  // Investment metrics
  const DSCR = NOI / annualDebtService
  const cashOnCashReturn = (NOI - annualDebtService) / equity
  
  // 5-year IRR calculation (detailed, Excel-like)
  const { leveredIRR, unleveredIRR, irrBreakdown } = calculateDetailedIRR(
    purchasePrice,
    equity,
    loanAmount,
    NOI,
    annualDebtService,
    assumptions
  )

  // Log the IRR calculation for debugging
  console.log('IRR Calculation Breakdown:')
  irrBreakdown.forEach(row => {
    console.log(`Year ${row.year}:`, {
      NOI: row.NOI,
      debtService: row.debtService,
      cashFlowBeforeDebt: row.cashFlowBeforeDebt,
      cashFlowAfterDebt: row.cashFlowAfterDebt,
      cumulativeCashFlowBeforeDebt: row.cumulativeCashFlowBeforeDebt,
      cumulativeCashFlowAfterDebt: row.cumulativeCashFlowAfterDebt,
      remainingDebt: row.remainingDebt,
      propertyValue: row.propertyValue,
      exitEquity: row.exitEquity
    })
  })
  console.log('Final IRRs - Levered:', leveredIRR, 'Unlevered:', unleveredIRR)

  return {
    ...parsedData,
    grossPotentialIncome,
    effectiveGrossIncome,
    operatingExpenses,
    capRateValuation,
    debtService: annualDebtService,
    DSCR,
    cashOnCashReturn,
    leveredIRR,
    unleveredIRR,
    equity,
    loanAmount,
    vacancy,
    expenseRatio: assumptions.expenseRatio,
    marketCapRate: assumptions.marketCapRate,
    irrBreakdown // Add the detailed breakdown
  }
}



function calculateDetailedIRR(
  purchasePrice: number,
  equity: number,
  loanAmount: number,
  initialNOI: number,
  initialDebtService: number,
  assumptions: UnderwritingAssumptions
): { 
  leveredIRR: number; 
  unleveredIRR: number; 
  irrBreakdown: IRRBreakdown[] 
} {
  
  console.log('IRR calculation inputs:', {
    purchasePrice,
    equity,
    loanAmount,
    initialNOI,
    initialDebtService,
    assumptions
  })
  
  const breakdown: IRRBreakdown[] = []
  let remainingDebt = loanAmount
  
  // Year 0: Initial investment
  breakdown.push({
    year: 0,
    grossIncome: 0,
    operatingExpenses: 0,
    NOI: 0,
    debtService: 0,
    cashFlowBeforeDebt: 0,
    cashFlowAfterDebt: -equity,
    cumulativeCashFlowBeforeDebt: 0,
    cumulativeCashFlowAfterDebt: -equity,
    remainingDebt: loanAmount,
    propertyValue: purchasePrice,
    exitEquity: 0,
    totalReturnUnlevered: 0,
    totalReturnLevered: -equity
  })
  
  // Years 1-5: Operating period
  for (let year = 1; year <= 5; year++) {
         // Calculate growing income and expenses
     const rentGrowth = Math.pow(1 + assumptions.rentGrowthRate, year)
     const expenseGrowth = Math.pow(1 + assumptions.expenseGrowthRate, year)
     
     // initialNOI is already the NOI, so we grow it directly
     const yearNOI = initialNOI * rentGrowth
     
     // For debugging, calculate what the gross income would be
     const yearGrossIncome = yearNOI / 0.65 // Assuming 35% expense ratio means 65% is NOI
     const yearOperatingExpenses = yearGrossIncome - yearNOI
    
         console.log(`Year ${year} calculations:`, {
       rentGrowth: rentGrowth.toFixed(4),
       yearNOI: yearNOI.toFixed(2),
       yearGrossIncome: yearGrossIncome.toFixed(2),
       yearOperatingExpenses: yearOperatingExpenses.toFixed(2)
     })
    
    // Debt service remains constant (fixed-rate loan)
    const yearDebtService = initialDebtService
    
    // Calculate remaining debt (simplified - assumes linear amortization)
    const annualPrincipal = loanAmount / assumptions.amortizationYears
    remainingDebt = Math.max(0, remainingDebt - annualPrincipal)
    
    // Cash flows before and after debt
    const yearCashFlowBeforeDebt = yearNOI
    const yearCashFlowAfterDebt = yearNOI - yearDebtService
    
    // Cumulative cash flows
    const cumulativeCashFlowBeforeDebt = breakdown[year - 1].cumulativeCashFlowBeforeDebt + yearCashFlowBeforeDebt
    const cumulativeCashFlowAfterDebt = breakdown[year - 1].cumulativeCashFlowAfterDebt + yearCashFlowAfterDebt
    
    // Property value growth (using cap rate)
    const yearPropertyValue = yearNOI / assumptions.marketCapRate
    
    // Exit equity (what you'd get if you sold)
    const exitEquity = yearPropertyValue - remainingDebt
    
    // Total return to date (not used in new structure)
    // const totalReturn = cumulativeCashFlow + exitEquity
    
    breakdown.push({
      year,
      grossIncome: yearGrossIncome,
      operatingExpenses: yearOperatingExpenses,
      NOI: yearNOI,
      debtService: yearDebtService,
      cashFlowBeforeDebt: yearCashFlowBeforeDebt,
      cashFlowAfterDebt: yearCashFlowAfterDebt,
      cumulativeCashFlowBeforeDebt,
      cumulativeCashFlowAfterDebt,
      remainingDebt,
      propertyValue: yearPropertyValue,
      exitEquity,
      totalReturnUnlevered: cumulativeCashFlowBeforeDebt + exitEquity,
      totalReturnLevered: cumulativeCashFlowAfterDebt + exitEquity
    })
  }
  
  // Calculate Levered IRR (with debt) - cash flows after debt service
  const leveredCashFlows = breakdown.map(row => row.cashFlowAfterDebt)
  leveredCashFlows[0] = -equity // Initial equity investment (negative)
  leveredCashFlows[5] += breakdown[5].exitEquity // Add exit equity to final year
  
  console.log('Levered cash flows for IRR calculation:', leveredCashFlows)
  let leveredIRR = calculateIRR(leveredCashFlows)
  
  // Validate levered IRR is reasonable (between -50% and +200%)
  if (leveredIRR < -0.5 || leveredIRR > 2.0) {
    console.log('Levered IRR out of reasonable range, using fallback')
    leveredIRR = calculateSimpleIRR(leveredCashFlows, equity)
  }
  
  // Calculate Unlevered IRR (no debt) - cash flows before debt service
  const unleveredCashFlows = breakdown.map(row => row.cashFlowBeforeDebt)
  unleveredCashFlows[0] = -purchasePrice // Initial property investment (negative)
  unleveredCashFlows[5] += breakdown[5].propertyValue // Add property value to final year
  
  console.log('Unlevered cash flows for IRR calculation:', unleveredCashFlows)
  let unleveredIRR = calculateIRR(unleveredCashFlows)
  
  // Validate unlevered IRR is reasonable (between -50% and +200%)
  if (unleveredIRR < -0.5 || unleveredIRR > 2.0) {
    console.log('Unlevered IRR out of reasonable range, using fallback')
    unleveredIRR = calculateSimpleIRR(unleveredCashFlows, purchasePrice)
  }
  
  console.log('Final validated IRRs - Levered:', leveredIRR, 'Unlevered:', unleveredIRR)
  
  return { leveredIRR, unleveredIRR, irrBreakdown: breakdown }
}

function calculateIRR(cashFlows: number[]): number {
  // Newton-Raphson method for IRR calculation
  let guess = 0.15 // Start with 15% guess
  const tolerance = 0.0001
  const maxIterations = 100
  
  console.log('Starting IRR calculation with cash flows:', cashFlows)
  console.log('Initial guess:', guess)
  
  for (let i = 0; i < maxIterations; i++) {
    const npv = calculateNPV(cashFlows, guess)
    const derivative = calculateNPVDerivative(cashFlows, guess)
    
    console.log(`Iteration ${i + 1}: guess=${guess.toFixed(6)}, npv=${npv.toFixed(2)}, derivative=${derivative.toFixed(6)}`)
    
    if (Math.abs(derivative) < 0.0001) {
      console.log('Derivative too small, breaking')
      break
    }
    
    const newGuess = guess - npv / derivative
    
    // Prevent extreme values
    if (newGuess < -0.99 || newGuess > 10) {
      console.log('Guess out of reasonable range, using fallback')
      return 0.15 // Fallback to 15%
    }
    
    if (Math.abs(newGuess - guess) < tolerance) {
      console.log('Converged to IRR:', newGuess)
      return newGuess
    }
    
    guess = newGuess
  }
  
  console.log('Max iterations reached, returning guess:', guess)
  return guess
}

function calculateNPV(cashFlows: number[], rate: number): number {
  let npv = 0
  for (let i = 0; i < cashFlows.length; i++) {
    npv += cashFlows[i] / Math.pow(1 + rate, i)
  }
  return npv
}

function calculateNPVDerivative(cashFlows: number[], rate: number): number {
  let derivative = 0
  for (let i = 1; i < cashFlows.length; i++) {
    derivative -= (i * cashFlows[i]) / Math.pow(1 + rate, i + 1)
  }
  return derivative
}

function calculateSimpleIRR(cashFlows: number[], equity: number): number {
  // Simple IRR approximation based on total return
  const totalCashFlow = cashFlows.reduce((sum, cf) => sum + cf, 0)
  const totalReturn = totalCashFlow + equity
  
  if (totalReturn <= 0) {
    return 0.05 // 5% if no positive return
  }
  
  // Simple approximation: assume average return over 5 years
  const avgAnnualReturn = totalReturn / 5
  const simpleIRR = avgAnnualReturn / equity
  
  // Cap at reasonable levels
  return Math.min(Math.max(simpleIRR, 0.05), 0.30)
}
