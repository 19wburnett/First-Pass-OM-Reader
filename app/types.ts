export interface DealData {
  propertyName: string
  purchasePrice: number
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
}

export interface ParsedOMData {
  propertyName: string
  purchasePrice: number
  units: number
  occupancy: number
  avgRent: number
  expenses: number
  NOI: number
  marketCapRate: number
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
}
