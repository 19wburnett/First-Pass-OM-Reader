import { NextRequest, NextResponse } from 'next/server'
import pdf from 'pdf-parse'
import OpenAI from 'openai'
import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import { ParsedOMData, DealData, UnderwritingAssumptions, IRRBreakdown, RentRollData } from '../../types'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

async function parseRentRoll(file: File): Promise<RentRollData> {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    let data: any[] = []
    
    if (file.name.endsWith('.csv')) {
      // Parse CSV
      const csvText = buffer.toString('utf-8')
      const result = Papa.parse(csvText, { header: true, skipEmptyLines: true })
      data = result.data
    } else {
      // Parse Excel
      const workbook = XLSX.read(buffer, { type: 'buffer' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      data = XLSX.utils.sheet_to_json(worksheet)
    }
    
    console.log('Raw rent roll data:', data)
    
    if (data.length === 0) {
      throw new Error('No data found in rent roll file')
    }
    
    // Process the data to extract rent roll information
    let totalUnits = 0
    let occupiedUnits = 0
    let vacantUnits = 0
    let totalMonthlyRent = 0
    const units: any[] = []
    
    console.log('Processing rent roll rows:', data.length)
    
    for (const row of data) {
      console.log('Processing row:', row)
      
      // Try to identify unit information from various column names
      const unitNumber = row.Unit || row.unit || row.unitNumber || row.unit_number || row['Unit #'] || row['Unit Number'] || ''
      const unitType = row.Type || row.type || row.unitType || row.unit_type || row['Unit Type'] || 'Unknown'
      const monthlyRent = parseFloat(row['Monthly Rent'] || row.rent || row.monthlyRent || row.monthly_rent || row['Rent'] || '0') || 0
      const status = row.Status || row.status || row.occupancy || row['Status'] || row['Occupancy'] || 'occupied'
      const tenantName = row.Tenant || row.tenant || row.tenantName || row.tenant_name || row['Tenant'] || row['Tenant Name'] || ''
      
      // Debug: log the actual row keys to see what we're working with
      if (Object.keys(row).length > 0) {
        console.log('Row keys:', Object.keys(row))
        console.log('Row values:', Object.values(row))
      }
      
      console.log('Extracted values:', { unitNumber, unitType, monthlyRent, status, tenantName })
      
      if (unitNumber && monthlyRent > 0) {
        totalUnits++
        totalMonthlyRent += monthlyRent
        
        if (status.toLowerCase().includes('vacant') || status.toLowerCase().includes('empty')) {
          vacantUnits++
        } else {
          occupiedUnits++
        }
        
        units.push({
          unitNumber: unitNumber.toString(),
          unitType: unitType.toString(),
          monthlyRent,
          status: status.toLowerCase().includes('vacant') ? 'vacant' : 'occupied',
          tenantName: tenantName || undefined
        })
      } else {
        console.log('Skipping row - missing unitNumber or monthlyRent:', { unitNumber, monthlyRent })
      }
    }
    
    const occupancyRate = totalUnits > 0 ? occupiedUnits / totalUnits : 0
    const averageMonthlyRent = totalUnits > 0 ? totalMonthlyRent / totalUnits : 0
    
    const rentRollData: RentRollData = {
      totalUnits,
      occupiedUnits,
      vacantUnits,
      totalMonthlyRent,
      averageMonthlyRent,
      occupancyRate,
      units
    }
    
    console.log('Processed rent roll data:', rentRollData)
    return rentRollData
    
  } catch (error) {
    console.error('Error parsing rent roll:', error)
    throw new Error(`Failed to parse rent roll: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

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
  analysisTerm: 5 // 5-year analysis by default
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const pdfFile = formData.get('pdf') as File
    const rentRollFile = formData.get('rentRoll') as File | null

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

    // Parse rent roll if provided
    let rentRollData: RentRollData | undefined
    if (rentRollFile) {
      try {
        rentRollData = await parseRentRoll(rentRollFile)
        console.log('Rent roll parsed successfully:', rentRollData)
      } catch (rentRollError) {
        console.warn('Failed to parse rent roll, continuing with OM only:', rentRollError)
        // Continue without rent roll data
      }
    }

    // Send to OpenAI for analysis (rent roll data is now included in the response)
    const parsedData = await analyzeWithOpenAI(extractedText, rentRollData)
    
    console.log('Parsed data from OpenAI with rent roll:', {
      hasRentRollData: !!parsedData.rentRollData,
      rentRollUnits: parsedData.rentRollData?.totalUnits,
      rentRollMonthlyRent: parsedData.rentRollData?.totalMonthlyRent
    })
    
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

async function analyzeWithOpenAI(text: string, rentRollData?: RentRollData): Promise<ParsedOMData> {
  const prompt = `
You are a commercial real estate analyst. Extract the following information from this Offering Memorandum text and return ONLY a valid JSON object with these exact field names:

{
  "propertyName": "string - name of the property",
  "whisperPrice": number - asking price or suggested price mentioned in the OM in USD (no commas or symbols). If no price is mentioned, use null,
  "units": number - total number of units (if not specified, look for total units, apartments, or residential units),
  "occupancy": number - occupancy rate as decimal (e.g., 0.95 for 95%),
  "avgRent": number - average monthly rent per unit in USD. IMPORTANT: Look for 'average rent', 'monthly rent', 'rent per unit', 'unit rent', 'monthly rate', or similar terms. If you see total annual income or gross potential income, divide by (units × 12) to get monthly rent per unit. Do NOT use $1,500 as default.,
  "expenses": number - annual operating expenses in USD (look for 'operating expenses', 'annual expenses', or similar terms),
  "NOI": number - Net Operating Income in USD (look for 'NOI', 'Net Operating Income', or similar terms),
  "marketCapRate": number - market cap rate as decimal (e.g., 0.06 for 6%)
}

${rentRollData ? `
IMPORTANT: You have access to actual rent roll data. Use this data to override OM estimates:
- Total Units: ${rentRollData.totalUnits}
- Occupied Units: ${rentRollData.occupiedUnits}
- Vacant Units: ${rentRollData.vacantUnits}
- Total Monthly Rent: $${rentRollData.totalMonthlyRent.toLocaleString()}
- Average Monthly Rent: $${rentRollData.averageMonthlyRent.toLocaleString()}
- Actual Occupancy Rate: ${(rentRollData.occupancyRate * 100).toFixed(1)}%

Use the rent roll data for units, occupancy, and avgRent instead of trying to extract from the OM text.
` : ''}

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
        content: 'You are a commercial real estate analyst. You MUST return ONLY valid JSON with proper quotes around all property names and string values. Numbers should be unquoted. Do not include any explanatory text before or after the JSON.'
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

    let jsonText = jsonMatch[0]
    console.log('Extracted JSON text:', jsonText)
    
    // Try to clean up common JSON formatting issues
    jsonText = jsonText
      .replace(/(\w+):/g, '"$1":') // Add quotes around property names
      .replace(/:\s*([^",\{\}\[\]]+)(?=\s*[,}\s])/g, ': "$1"') // Add quotes around string values
      .replace(/:\s*null(?=\s*[,}\s])/g, ': null') // Keep null as null
      .replace(/:\s*(\d+\.?\d*)(?=\s*[,}\s])/g, ': $1') // Keep numbers as numbers
    
    console.log('Cleaned JSON text:', jsonText)
    
    let parsedData
    try {
      parsedData = JSON.parse(jsonText)
    } catch (cleanError) {
      console.log('Failed to parse cleaned JSON, trying original:', cleanError instanceof Error ? cleanError.message : 'Unknown error')
      // Fall back to original JSON parsing
      parsedData = JSON.parse(jsonMatch[0])
    }
    
    // Handle backward compatibility and field name variations
    if (parsedData.purchasePrice !== undefined && parsedData.whisperPrice === undefined) {
      console.log('AI returned purchasePrice, converting to whisperPrice for backward compatibility')
      parsedData.whisperPrice = parsedData.purchasePrice
      delete parsedData.purchasePrice
    }
    
    // Handle other possible field name variations
    if (parsedData.property_name !== undefined && !parsedData.propertyName) {
      parsedData.propertyName = parsedData.property_name
      delete parsedData.property_name
    }
    
    if (parsedData.avg_rent !== undefined && !parsedData.avgRent) {
      parsedData.avgRent = parsedData.avg_rent
      delete parsedData.avg_rent
    }
    
    if (parsedData.market_cap_rate !== undefined && !parsedData.marketCapRate) {
      parsedData.marketCapRate = parsedData.market_cap_rate
      delete parsedData.market_cap_rate
    }
    
    // Log the full response for debugging
    console.log('Raw AI response:', responseText)
    console.log('Parsed data:', parsedData)
    
    // Validate required fields with detailed logging and provide defaults
    const missingFields = []
    if (!parsedData.propertyName) missingFields.push('propertyName')
    if (!parsedData.units) missingFields.push('units')
    if (!parsedData.avgRent) missingFields.push('avgRent')
    
    if (missingFields.length > 0) {
      console.error('Missing required fields:', missingFields)
      console.error('Available fields:', Object.keys(parsedData))
      console.error('Field values:', parsedData)
      
      // Provide reasonable defaults for missing fields
      if (!parsedData.propertyName) parsedData.propertyName = 'Unknown Property'
      if (!parsedData.units) parsedData.units = 100 // Default to 100 units
      if (!parsedData.avgRent) parsedData.avgRent = 1500 // Default to $1,500/month
      
      console.log('Applied default values for missing fields:', parsedData)
    } else {
      console.log('All required fields successfully extracted from OM')
    }
    
    // Log the final values that will be used for calculations
    const expectedGPI = parsedData.units * parsedData.avgRent * 12
    console.log('Final values for calculations:', {
      units: parsedData.units,
      avgRent: parsedData.avgRent,
      expectedGPI,
      whisperPrice: parsedData.whisperPrice,
      expenses: parsedData.expenses,
      NOI: parsedData.NOI,
      marketCapRate: parsedData.marketCapRate
    })
    
    // Validate that avgRent makes sense
    if (parsedData.avgRent === 1500) {
      console.warn('⚠️ WARNING: AI extracted default avgRent of $1,500. This might be wrong!')
      console.warn('If your OM shows different rent information, the AI failed to extract it correctly.')
    }
    
    // Validate that the calculated GPI makes sense
    if (expectedGPI > 1000000) {
      console.warn('⚠️ WARNING: Calculated GPI seems very high. AI might have extracted wrong rent or units.')
    }

    console.log('Successfully parsed AI response:', parsedData)
    
    // Include rent roll data in the returned data
    const enhancedParsedData: ParsedOMData = {
      ...parsedData,
      rentRollData
    }
    
    console.log('Enhanced parsed data with rent roll:', {
      hasRentRollData: !!enhancedParsedData.rentRollData,
      rentRollUnits: enhancedParsedData.rentRollData?.totalUnits,
      rentRollMonthlyRent: enhancedParsedData.rentRollData?.totalMonthlyRent
    })
    
    return enhancedParsedData
  } catch (parseError) {
    console.error('Failed to parse OpenAI response:', responseText)
    console.error('Parse error:', parseError)
    
    // Try to extract any useful information from the response
    if (responseText.includes('property') || responseText.includes('rent') || responseText.includes('units')) {
      console.log('Response contains some property information, attempting to extract...')
      // You could add more sophisticated parsing here if needed
    }
    
    throw new Error(`Failed to parse AI analysis: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`)
  }
}

function performUnderwritingCalculations(
  parsedData: ParsedOMData, 
  assumptions: UnderwritingAssumptions
): DealData {
  const {
    whisperPrice,
    units,
    occupancy,
    avgRent,
    expenses: parsedExpenses,
    NOI: parsedNOI,
    marketCapRate,
    rentRollData
  } = parsedData

  // Use rent roll data if available, otherwise use OM data
  const finalUnits = rentRollData ? rentRollData.totalUnits : units
  const finalOccupancy = rentRollData ? rentRollData.occupancyRate : occupancy
  const finalAvgRent = rentRollData ? rentRollData.averageMonthlyRent : avgRent
  
  console.log('Final values for calculations:', {
    rentRollData: !!rentRollData,
    rentRollDataDetails: rentRollData ? {
      totalUnits: rentRollData.totalUnits,
      totalMonthlyRent: rentRollData.totalMonthlyRent,
      occupancyRate: rentRollData.occupancyRate
    } : null,
    finalUnits,
    finalOccupancy,
    finalAvgRent,
    originalUnits: units,
    originalOccupancy: occupancy,
    originalAvgRent: avgRent
  })

  // Calculate pro forma metrics
  console.log('Pro forma calculation inputs:', {
    finalUnits,
    finalAvgRent,
    finalOccupancy,
    parsedExpenses,
    parsedNOI,
    marketCapRate
  })
  
  const grossPotentialIncome = finalUnits * finalAvgRent * 12
  const vacancy = finalOccupancy // Use actual occupancy from rent roll if available
  const effectiveGrossIncome = grossPotentialIncome * (1 - vacancy)
  
  // If we have rent roll data, calculate NOI from scratch
  let finalNOI = parsedNOI
  if (rentRollData && rentRollData.totalUnits > 0) {
    // Calculate NOI based on rent roll data
    const annualRent = rentRollData.totalMonthlyRent * 12
    const vacancyLoss = annualRent * (1 - rentRollData.occupancyRate)
    const effectiveGrossIncome = annualRent - vacancyLoss
    const operatingExpenses = effectiveGrossIncome * assumptions.expenseRatio
    finalNOI = effectiveGrossIncome - operatingExpenses
    
    console.log('Calculated NOI from rent roll:', {
      annualRent,
      vacancyLoss,
      effectiveGrossIncome,
      operatingExpenses,
      finalNOI
    })
  }
  
  // Ensure we have a valid NOI
  if (!finalNOI || finalNOI <= 0) {
    console.log('⚠️ WARNING: Invalid NOI detected, using fallback calculation')
    finalNOI = effectiveGrossIncome * (1 - assumptions.expenseRatio)
    console.log('Fallback NOI calculated:', finalNOI)
  }
  
  console.log('Pro forma calculations:', {
    grossPotentialIncome,
    vacancy,
    effectiveGrossIncome
  })
  
  // Use parsed expenses or calculate based on assumption
  const operatingExpenses = parsedExpenses || (effectiveGrossIncome * assumptions.expenseRatio)
  
  // Use the calculated finalNOI (from rent roll if available) instead of parsed NOI
  const NOI = finalNOI
  
  // Calculate purchase price using cap rate and NOI (this is the "market value")
  const purchasePrice = NOI / assumptions.marketCapRate
  
  // Calculate price difference (whisper price - calculated price)
  const priceDifference = whisperPrice && whisperPrice > 0 ? whisperPrice - purchasePrice : 0
  
  // Cap rate valuation (same as purchase price)
  const capRateValuation = purchasePrice
  
  console.log('Pricing calculations:', {
    whisperPrice,
    originalParsedNOI: parsedNOI,
    calculatedFinalNOI: finalNOI,
    finalNOIUsed: NOI,
    marketCapRate: assumptions.marketCapRate,
    calculatedPurchasePrice: purchasePrice,
    priceDifference
  })
  
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
  
  // Dynamic-term IRR calculation (detailed, Excel-like)
  const { leveredIRR, unleveredIRR, irrBreakdown } = calculateDetailedIRR(
    purchasePrice, // Now calculated from cap rate and NOI
    equity,
    loanAmount,
    NOI,
    annualDebtService,
    assumptions,
    rentRollData // Pass rent roll data for accurate calculations
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

  const finalDealData = {
    ...parsedData,
    units: finalUnits, // Use final units (rent roll or OM)
    occupancy: finalOccupancy, // Use final occupancy (rent roll or OM)
    avgRent: finalAvgRent, // Use final avg rent (rent roll or OM)
    NOI: finalNOI, // Use calculated NOI from rent roll if available
    purchasePrice, // Calculated price using cap rate and NOI
    priceDifference, // Difference between whisper price and calculated price
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
    irrBreakdown, // Add the detailed breakdown
    rentRollData // Include rent roll data if available
  }
  
  console.log('Final deal data being returned:', {
    units: finalDealData.units,
    occupancy: finalDealData.occupancy,
    avgRent: finalDealData.avgRent,
    NOI: finalDealData.NOI,
    rentRollData: !!finalDealData.rentRollData
  })
  
  return finalDealData
}



function calculateDetailedIRR(
  purchasePrice: number,
  equity: number,
  loanAmount: number,
  initialNOI: number,
  initialDebtService: number,
  assumptions: UnderwritingAssumptions,
  rentRollData?: RentRollData
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
     totalReturnLevered: -equity,
     annualCashOnCash: 0
   })
  
  // Years 1 to analysisTerm: Operating period
  for (let year = 1; year <= assumptions.analysisTerm; year++) {
         // Calculate growing income and expenses
     const rentGrowth = Math.pow(1 + assumptions.rentGrowthRate, year)
     const expenseGrowth = Math.pow(1 + assumptions.expenseGrowthRate, year)
     
     // Use rent roll data if available for accurate gross income
     let yearGrossIncome: number
     let yearOperatingExpenses: number
     let yearNOI: number
     
     if (rentRollData && rentRollData.totalUnits > 0) {
       // Calculate from actual rent roll data
       const baseAnnualRent = rentRollData.totalMonthlyRent * 12
       yearGrossIncome = baseAnnualRent * rentGrowth
       yearOperatingExpenses = yearGrossIncome * assumptions.expenseRatio
       yearNOI = yearGrossIncome - yearOperatingExpenses
     } else {
       // Fallback to NOI-based calculation
       yearNOI = initialNOI * rentGrowth
       yearGrossIncome = yearNOI / (1 - assumptions.expenseRatio)
       yearOperatingExpenses = yearGrossIncome - yearNOI
     }
    
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
    const yearPropertyValue = year === assumptions.analysisTerm ? 
      (yearNOI / assumptions.exitCapRate) : // Use exit cap rate for final year
      (yearNOI / assumptions.marketCapRate) // Use market cap rate for intermediate years
    
    // Exit equity (what you'd get if you sold)
    const exitEquity = year === assumptions.analysisTerm ? yearPropertyValue - remainingDebt : 0
    
    // Total return to date (not used in new structure)
    // const totalReturn = cumulativeCashFlow + exitEquity
    
         // Calculate annual cash-on-cash return (Year 1-5 only, not Year 0)
     const annualCashOnCash = year === 0 ? 0 : yearCashFlowAfterDebt / equity
     
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
       totalReturnLevered: cumulativeCashFlowAfterDebt + exitEquity,
       annualCashOnCash
     })
  }
  
  // Calculate Levered IRR (with debt) - cash flows after debt service
  const leveredCashFlows = breakdown.map(row => row.cashFlowAfterDebt)
  leveredCashFlows[0] = -equity // Initial equity investment (negative)
  leveredCashFlows[assumptions.analysisTerm] += (breakdown[assumptions.analysisTerm].propertyValue - breakdown[assumptions.analysisTerm].remainingDebt) // Add net sale proceeds to final year
  
  console.log('Levered cash flows for IRR calculation:', leveredCashFlows)
  let leveredIRR = calculateIRR(leveredCashFlows)
  
  // Validate levered IRR is reasonable (between -50% and +200%)
  if (leveredIRR < -0.5 || leveredIRR > 2.0) {
    console.log('Levered IRR out of reasonable range, using fallback')
    leveredIRR = calculateSimpleIRR(leveredCashFlows, equity, assumptions.analysisTerm)
  }
  
  // Calculate Unlevered IRR (no debt) - cash flows before debt service
  const unleveredCashFlows = breakdown.map(row => row.cashFlowBeforeDebt)
  unleveredCashFlows[0] = -purchasePrice // Initial property investment (negative)
  unleveredCashFlows[assumptions.analysisTerm] += breakdown[assumptions.analysisTerm].propertyValue // Add full property sale value to final year
  
  console.log('Unlevered cash flows for IRR calculation:', unleveredCashFlows)
  let unleveredIRR = calculateIRR(unleveredCashFlows)
  
  // Validate unlevered IRR is reasonable (between -50% and +200%)
  if (unleveredIRR < -0.5 || unleveredIRR > 2.0) {
    console.log('Unlevered IRR out of reasonable range, using fallback')
    unleveredIRR = calculateSimpleIRR(unleveredCashFlows, purchasePrice, assumptions.analysisTerm)
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

function calculateSimpleIRR(cashFlows: number[], equity: number, analysisTerm: number = 5): number {
  // Simple IRR approximation based on total return
  const totalCashFlow = cashFlows.reduce((sum, cf) => sum + cf, 0)
  const totalReturn = totalCashFlow + equity
  
  if (totalReturn <= 0) {
    return 0.05 // 5% if no positive return
  }
  
  // Simple approximation: assume average return over analysis term
  const avgAnnualReturn = totalReturn / analysisTerm
  const simpleIRR = avgAnnualReturn / equity
  
  // Cap at reasonable levels
  return Math.min(Math.max(simpleIRR, 0.05), 0.30)
}
