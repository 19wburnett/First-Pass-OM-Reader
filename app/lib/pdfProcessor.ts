
import * as pdfjsLib from 'pdfjs-dist'

// Disable worker to avoid CORS issues - use main thread instead
pdfjsLib.GlobalWorkerOptions.workerSrc = ''

export interface ExtractedData {
  text: string
  propertyName?: string
  address?: string
  totalUnits?: number
  totalRent?: number
  occupancyRate?: number
  capRate?: number
  noi?: number
  purchasePrice?: number
  metrics: {
    [key: string]: string | number
  }
}

export async function processPDFLocally(file: File): Promise<ExtractedData> {
  try {
    console.log('Starting PDF processing for file:', file.name, 'Size:', file.size)
    
    // Convert file to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    console.log('File converted to ArrayBuffer, size:', arrayBuffer.byteLength)
    
    // Load PDF document without worker
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true
    })
    
    const pdf = await loadingTask.promise
    console.log('PDF loaded successfully, pages:', pdf.numPages)
    
    let fullText = ''
    const metrics: { [key: string]: string | number } = {}
    
    // Extract text from all pages
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      console.log(`Processing page ${pageNum}/${pdf.numPages}`)
      const page = await pdf.getPage(pageNum)
      const textContent = await page.getTextContent()
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ')
      
      fullText += pageText + ' '
      console.log(`Page ${pageNum} text length:`, pageText.length)
    }
    
    // Clean up text
    fullText = fullText.replace(/\s+/g, ' ').trim()
    console.log('Total extracted text length:', fullText.length)
    
    // Extract key metrics using regex patterns
    const extractedData = extractMetrics(fullText)
    console.log('Extracted metrics:', extractedData)
    
    return {
      text: fullText,
      ...extractedData,
      metrics
    }
    
  } catch (error) {
    console.error('PDF processing error:', error)
    throw new Error(`Failed to process PDF file: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

function extractMetrics(text: string): Partial<ExtractedData> {
  const metrics: { [key: string]: string | number } = {}
  
  // Property name patterns
  const propertyNameMatch = text.match(/(?:Property|Asset|Building|Complex)[\s:]+([A-Za-z0-9\s&'-]+?)(?:\n|$|,|\.)/i)
  if (propertyNameMatch) {
    metrics.propertyName = propertyNameMatch[1].trim()
  }
  
  // Address patterns
  const addressMatch = text.match(/(?:Address|Location)[\s:]+([A-Za-z0-9\s,.-]+?)(?:\n|$|,|\.)/i)
  if (addressMatch) {
    metrics.address = addressMatch[1].trim()
  }
  
  // Unit count patterns
  const unitsMatch = text.match(/(?:Total Units|Units|Unit Count)[\s:]*(\d+)/i)
  if (unitsMatch) {
    metrics.totalUnits = parseInt(unitsMatch[1])
  }
  
  // Rent patterns
  const rentMatch = text.match(/(?:Total Rent|Monthly Rent|Annual Rent)[\s:]*[\$]?([\d,]+(?:\.\d{2})?)/i)
  if (rentMatch) {
    metrics.totalRent = parseFloat(rentMatch[1].replace(/,/g, ''))
  }
  
  // Occupancy patterns
  const occupancyMatch = text.match(/(?:Occupancy|Occupied)[\s:]*(\d+(?:\.\d+)?)%?/i)
  if (occupancyMatch) {
    metrics.occupancyRate = parseFloat(occupancyMatch[1]) / 100
  }
  
  // Cap rate patterns
  const capRateMatch = text.match(/(?:Cap Rate|Capitalization Rate)[\s:]*(\d+(?:\.\d+)?)%?/i)
  if (capRateMatch) {
    metrics.capRate = parseFloat(capRateMatch[1]) / 100
  }
  
  // NOI patterns
  const noiMatch = text.match(/(?:NOI|Net Operating Income)[\s:]*[\$]?([\d,]+(?:\.\d{2})?)/i)
  if (noiMatch) {
    metrics.noi = parseFloat(noiMatch[1].replace(/,/g, ''))
  }
  
  // Purchase price patterns
  const priceMatch = text.match(/(?:Purchase Price|Price|Value)[\s:]*[\$]?([\d,]+(?:\.\d{2})?)/i)
  if (priceMatch) {
    metrics.purchasePrice = parseFloat(priceMatch[1].replace(/,/g, ''))
  }
  
  // Look for common real estate metrics
  const commonPatterns = [
    { key: 'vacancyRate', pattern: /(?:Vacancy|Vacant)[\s:]*(\d+(?:\.\d+)?)%?/i },
    { key: 'expenseRatio', pattern: /(?:Expense Ratio|Operating Expenses)[\s:]*(\d+(?:\.\d+)?)%?/i },
    { key: 'loanAmount', pattern: /(?:Loan Amount|Mortgage|Debt)[\s:]*[\$]?([\d,]+(?:\.\d{2})?)/i },
    { key: 'interestRate', pattern: /(?:Interest Rate|Rate)[\s:]*(\d+(?:\.\d+)?)%?/i },
    { key: 'loanTerm', pattern: /(?:Loan Term|Term)[\s:]*(\d+)\s*(?:years?|yrs?)/i }
  ]
  
  commonPatterns.forEach(({ key, pattern }) => {
    const match = text.match(pattern)
    if (match) {
      let value: string | number = match[1]
      if (key.includes('Rate') || key.includes('Ratio')) {
        value = parseFloat(match[1]) / 100
      } else if (key.includes('Amount') || key.includes('Term')) {
        value = parseFloat(match[1].replace(/,/g, ''))
      }
      metrics[key] = value
    }
  })
  
  return {
    propertyName: typeof metrics.propertyName === 'string' ? metrics.propertyName : undefined,
    address: typeof metrics.address === 'string' ? metrics.address : undefined,
    totalUnits: typeof metrics.totalUnits === 'number' ? metrics.totalUnits : undefined,
    totalRent: typeof metrics.totalRent === 'number' ? metrics.totalRent : undefined,
    occupancyRate: typeof metrics.occupancyRate === 'number' ? metrics.occupancyRate : undefined,
    capRate: typeof metrics.capRate === 'number' ? metrics.capRate : undefined,
    noi: typeof metrics.noi === 'number' ? metrics.noi : undefined,
    purchasePrice: typeof metrics.purchasePrice === 'number' ? metrics.purchasePrice : undefined,
    metrics
  }
}
