import { NextRequest, NextResponse } from 'next/server'
import { DealData, UnderwritingAssumptions } from '../../types'

export async function POST(request: NextRequest) {
  try {
    const { dealData, newAssumptions, newPrice } = await request.json()

    // Recalculate IRR with new assumptions and/or new price
    const recalculatedData = recalculateIRRWithNewAssumptions(dealData, newAssumptions, newPrice)

    return NextResponse.json(recalculatedData)
  } catch (error) {
    console.error('Error recalculating IRR:', error)
    return NextResponse.json(
      { error: 'Failed to recalculate IRR' },
      { status: 500 }
    )
  }
}

function recalculateIRRWithNewAssumptions(
  dealData: DealData, 
  newAssumptions: UnderwritingAssumptions,
  newPrice?: number
): DealData {
  // Extract base data from original deal
  const {
    propertyName,
    whisperPrice,
    units,
    occupancy,
    avgRent,
    expenses: parsedExpenses,
    NOI: parsedNOI,
    marketCapRate: originalMarketCapRate
  } = dealData

  // Use new assumptions
  const assumptions = newAssumptions

  // Recalculate pro forma metrics with new assumptions
  const grossPotentialIncome = units * avgRent * 12
  const vacancy = assumptions.vacancy
  const effectiveGrossIncome = grossPotentialIncome * (1 - vacancy)
  
  // Use parsed expenses or calculate based on new assumption
  const operatingExpenses = parsedExpenses || (effectiveGrossIncome * assumptions.expenseRatio)
  
  // Use parsed NOI or calculate
  const NOI = parsedNOI || (effectiveGrossIncome - operatingExpenses)
  
  // Use new price if provided, otherwise calculate from cap rate
  const purchasePrice = newPrice || (NOI / assumptions.marketCapRate)
  
  // Calculate price difference (whisper price - calculated price)
  // If using whisper price, difference is 0. If using custom price, difference is custom - market
  let priceDifference: number
  if (newPrice === whisperPrice) {
    priceDifference = 0 // Using whisper price
  } else if (newPrice && newPrice !== (NOI / assumptions.marketCapRate)) {
    const marketValue = NOI / assumptions.marketCapRate
    priceDifference = newPrice - marketValue // Custom price vs market
  } else {
    priceDifference = whisperPrice && whisperPrice > 0 ? whisperPrice - purchasePrice : 0 // Original logic
  }
  
  // Cap rate valuation (same as purchase price)
  const capRateValuation = purchasePrice
  
  // Financing calculations with new assumptions
  const loanAmount = purchasePrice * assumptions.loanToValue
  const equity = purchasePrice - loanAmount
  
  // Calculate monthly payment for loan with new terms
  const monthlyRate = assumptions.interestRate / 12
  const totalPayments = assumptions.amortizationYears * 12
  const debtService = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) / 
                     (Math.pow(1 + monthlyRate, totalPayments) - 1)
  const annualDebtService = debtService * 12
  
  // Investment metrics
  const DSCR = NOI / annualDebtService
  const cashOnCashReturn = (NOI - annualDebtService) / equity
  
  // 5-year IRR calculation with new assumptions
  console.log('=== Pro Forma Inputs ===')
  console.log('Purchase Price:', purchasePrice)
  console.log('Equity:', equity)
  console.log('Loan Amount:', loanAmount)
  console.log('Initial NOI:', NOI)
  console.log('Annual Debt Service:', annualDebtService)
  console.log('Assumptions:', assumptions)
  
  const { leveredIRR, unleveredIRR, irrBreakdown } = calculateDetailedIRR(
    purchasePrice,
    equity,
    loanAmount,
    NOI,
    annualDebtService,
    assumptions,
    dealData.rentRollData // Pass rent roll data for accurate calculations
  )

  return {
    ...dealData,
    purchasePrice,
    priceDifference,
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
    irrBreakdown
  }
}

function calculateDetailedIRR(
  purchasePrice: number,
  equity: number,
  loanAmount: number,
  initialNOI: number,
  initialDebtService: number,
  assumptions: UnderwritingAssumptions,
  rentRollData?: any
) {
  const breakdown = []
  
  // Year 0 - Initial investment
  breakdown.push({
    year: 0,
    grossIncome: 0,
    operatingExpenses: 0,
    NOI: 0,
    debtService: 0,
    cashFlowBeforeDebt: -purchasePrice, // Unlevered: pay full property price
    cashFlowAfterDebt: -equity, // Levered: pay only equity portion
    cumulativeCashFlowBeforeDebt: -purchasePrice,
    cumulativeCashFlowAfterDebt: -equity,
    remainingDebt: loanAmount,
    propertyValue: purchasePrice,
    exitEquity: 0,
    totalReturnUnlevered: 0,
    totalReturnLevered: 0,
    annualCashOnCash: 0
  })

  // Years 1 to analysisTerm - Projected cash flows
  let cumulativeCashFlowBeforeDebt = 0
  let cumulativeCashFlowAfterDebt = -equity
  let remainingDebt = loanAmount

  for (let year = 1; year <= assumptions.analysisTerm; year++) {
    // Calculate growth factors
    const rentGrowth = Math.pow(1 + assumptions.rentGrowthRate, year)
    const expenseGrowth = Math.pow(1 + assumptions.expenseGrowthRate, year)
    
    // Calculate year-specific values
    let yearNOI: number
    let yearOperatingExpenses: number
    let yearGrossIncome: number
    
    if (rentRollData && rentRollData.totalUnits > 0) {
      // Calculate from actual rent roll data
      const baseAnnualRent = rentRollData.totalMonthlyRent * 12
      yearGrossIncome = baseAnnualRent * rentGrowth
      yearOperatingExpenses = yearGrossIncome * assumptions.expenseRatio
      yearNOI = yearGrossIncome - yearOperatingExpenses
    } else {
      // Fallback to NOI-based calculation
      yearNOI = initialNOI * rentGrowth
      yearOperatingExpenses = yearNOI * assumptions.expenseRatio * expenseGrowth
      yearGrossIncome = yearNOI + yearOperatingExpenses
    }
    
    // Calculate debt service (fixed for now, could be variable rate)
    const yearDebtService = initialDebtService
    
    // Calculate cash flows (operating only)
    const yearCashFlowBeforeDebt = yearNOI
    const yearCashFlowAfterDebt = yearNOI - yearDebtService
    
    // Update cumulative flows (operating only)
    cumulativeCashFlowBeforeDebt += yearCashFlowBeforeDebt
    cumulativeCashFlowAfterDebt += yearCashFlowAfterDebt
    
    // Calculate remaining debt (simplified - could use actual amortization schedule)
    remainingDebt = Math.max(0, remainingDebt - (yearDebtService - (loanAmount * assumptions.interestRate)))
    
    // Calculate property value at exit (final year)
    const propertyValue = year === assumptions.analysisTerm ? 
      (yearNOI / assumptions.exitCapRate) : 
      purchasePrice * Math.pow(1 + assumptions.rentGrowthRate, year)
    
    // Calculate exit equity
    const exitEquity = year === assumptions.analysisTerm ? propertyValue - remainingDebt : 0
    
    // Calculate annual cash on cash return
    const annualCashOnCash = year === 0 ? 0 : yearCashFlowAfterDebt / equity
    
    // For final year, add property sale to cash flows
    const finalCashFlowBeforeDebt = year === assumptions.analysisTerm ? yearCashFlowBeforeDebt + propertyValue : yearCashFlowBeforeDebt
    const finalCashFlowAfterDebt = year === assumptions.analysisTerm ? yearCashFlowAfterDebt + (propertyValue - remainingDebt) : yearCashFlowAfterDebt
    
    // Debug final year calculations
    if (year === assumptions.analysisTerm) {
      console.log(`=== Year ${assumptions.analysisTerm} Debug ===`)
      console.log(`Year ${assumptions.analysisTerm} NOI:`, yearNOI)
      console.log(`Property Value (Year ${assumptions.analysisTerm} NOI / Exit Cap):`, propertyValue)
      console.log('Operating Cash Flow Before Debt:', yearCashFlowBeforeDebt)
      console.log('Operating Cash Flow After Debt:', yearCashFlowAfterDebt)
      console.log('Final Unlevered Cash Flow:', finalCashFlowBeforeDebt)
      console.log('Final Levered Cash Flow:', finalCashFlowAfterDebt)
      console.log('Remaining Debt:', remainingDebt)
      console.log('Exit Equity:', exitEquity)
      console.log(`=== End Year ${assumptions.analysisTerm} Debug ===`)
    }
    
    breakdown.push({
      year,
      grossIncome: yearGrossIncome,
      operatingExpenses: yearOperatingExpenses,
      NOI: yearNOI,
      debtService: yearDebtService,
      cashFlowBeforeDebt: finalCashFlowBeforeDebt,
      cashFlowAfterDebt: finalCashFlowAfterDebt,
      cumulativeCashFlowBeforeDebt: cumulativeCashFlowBeforeDebt + (year === assumptions.analysisTerm ? propertyValue : 0),
      cumulativeCashFlowAfterDebt: cumulativeCashFlowAfterDebt + (year === assumptions.analysisTerm ? (propertyValue - remainingDebt) : 0),
      remainingDebt,
      propertyValue,
      exitEquity,
      totalReturnUnlevered: cumulativeCashFlowBeforeDebt + (year === assumptions.analysisTerm ? propertyValue : 0),
      totalReturnLevered: cumulativeCashFlowAfterDebt + (year === assumptions.analysisTerm ? (propertyValue - remainingDebt) : 0),
      annualCashOnCash
    })
  }

  // Calculate IRR using Newton-Raphson method
  console.log('=== IRR Calculation Debug ===')
  console.log('Levered cash flows:', breakdown.map(row => row.cashFlowAfterDebt))
  console.log('Unlevered cash flows:', breakdown.map(row => row.cashFlowBeforeDebt))
  
  const leveredIRR = calculateIRR(breakdown.map(row => row.cashFlowAfterDebt))
  const unleveredIRR = calculateIRR(breakdown.map(row => row.cashFlowBeforeDebt))
  
  console.log(`Final Results - Levered: ${(leveredIRR * 100).toFixed(2)}%, Unlevered: ${(unleveredIRR * 100).toFixed(2)}%`)
  console.log('=== End IRR Debug ===')

  return { leveredIRR, unleveredIRR, irrBreakdown: breakdown }
}

function calculateIRR(cashFlows: number[]): number {
  // Newton-Raphson method for IRR calculation
  let guess = 0.15 // Initial guess of 15%
  const maxIterations = 100
  const tolerance = 1e-6
  
  // Debug: log cash flows
  console.log('Cash flows for IRR calculation:', cashFlows)
  
  // Check if we have valid cash flows
  if (cashFlows.length < 2) {
    console.log('Invalid cash flows length:', cashFlows.length)
    return 0.15
  }
  
  // Check if first cash flow is negative (investment)
  if (cashFlows[0] >= 0) {
    console.log('First cash flow should be negative (investment):', cashFlows[0])
    return 0.15
  }
  
  // Check if we have positive cash flows later
  const hasPositiveFlows = cashFlows.slice(1).some(flow => flow > 0)
  if (!hasPositiveFlows) {
    console.log('No positive cash flows found after initial investment')
    return 0.15
  }

  for (let i = 0; i < maxIterations; i++) {
    const npv = calculateNPV(cashFlows, guess)
    const derivative = calculateNPVDerivative(cashFlows, guess)
    
    if (Math.abs(npv) < tolerance) {
      console.log(`IRR converged to ${(guess * 100).toFixed(2)}% after ${i + 1} iterations`)
      break
    }
    
    // Avoid division by zero
    if (Math.abs(derivative) < 1e-10) {
      console.log('Derivative too small, resetting guess')
      guess = 0.15
      continue
    }
    
    const newGuess = guess - npv / derivative
    
    // Ensure guess stays reasonable
    if (newGuess < -0.9 || newGuess > 10) {
      console.log(`Guess ${(newGuess * 100).toFixed(2)}% out of bounds, resetting to 15%`)
      guess = 0.15
    } else {
      guess = newGuess
    }
  }

  // Validate IRR is reasonable
  if (guess < -0.9 || guess > 10) {
    console.log(`Final IRR ${(guess * 100).toFixed(2)}% out of bounds, using fallback`)
    return 0.15
  }

  console.log(`Final IRR: ${(guess * 100).toFixed(2)}%`)
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
