export interface DealData {
  propertyName: string
  whisperPrice?: number // Price mentioned in OM (if any)
  purchasePrice: number // Calculated price using cap rate and NOI
  priceDifference: number // Difference: whisperPrice - purchasePrice
  units: number
  occupancy: number
  avgRent: number
  expenses: number
  NOI: number
  marketCapRate: number
  // Calculated fields
  grossPotentialIncome: number
  effectiveGrossIncome: number
  operatingExpenses: number
  capRateValuation: number
  debtService: number
  DSCR: number
  cashOnCashReturn: number
  leveredIRR: number
  unleveredIRR: number
  equity: number
  loanAmount: number
  vacancy: number
  expenseRatio: number
  irrBreakdown: IRRBreakdown[]
  // Rent roll data (if provided)
  rentRollData?: RentRollData
}

export interface ParsedOMData {
  propertyName: string
  whisperPrice?: number // Optional price mentioned in OM
  units: number
  occupancy: number
  avgRent: number
  expenses: number
  NOI: number
  marketCapRate: number
  // Rent roll data (if provided)
  rentRollData?: RentRollData
}

export interface RentRollData {
  totalUnits: number
  occupiedUnits: number
  vacantUnits: number
  totalMonthlyRent: number
  averageMonthlyRent: number
  occupancyRate: number
  // Detailed unit breakdown
  units: RentRollUnit[]
}

export interface RentRollUnit {
  unitNumber: string
  unitType: string // e.g., "1BR", "2BR", "Studio"
  monthlyRent: number
  status: 'occupied' | 'vacant' | 'reserved'
  tenantName?: string
  leaseStartDate?: string
  leaseEndDate?: string
}

export interface UnderwritingAssumptions {
  vacancy: number
  expenseRatio: number
  marketCapRate: number
  loanToValue: number
  interestRate: number
  amortizationYears: number
  rentGrowthRate: number
  expenseGrowthRate: number
  exitCapRate: number
  analysisTerm: number // Number of years for IRR analysis
}

export interface IRRBreakdown {
  year: number
  grossIncome: number
  operatingExpenses: number
  NOI: number
  debtService: number
  cashFlowBeforeDebt: number
  cashFlowAfterDebt: number
  cumulativeCashFlowBeforeDebt: number
  cumulativeCashFlowAfterDebt: number
  remainingDebt: number
  propertyValue: number
  exitEquity: number
  totalReturnUnlevered: number
  totalReturnLevered: number
  annualCashOnCash: number
}
