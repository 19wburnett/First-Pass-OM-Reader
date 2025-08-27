'use client'

import { DealData } from '../types'
import IRRBreakdown from './IRRBreakdown'

interface DealSummaryProps {
  dealData: DealData
}

export default function DealSummary({ dealData }: DealSummaryProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(1)}%`
  }

  const formatRatio = (value: number) => {
    return `${value.toFixed(2)}x`
  }

  const isGoodDeal = dealData.capRateValuation > dealData.purchasePrice

  return (
    <div className="space-y-6">
      {/* Property Header */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-xl font-bold text-gray-900">
            📊 Deal Summary – {dealData.propertyName}
          </h4>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            isGoodDeal 
              ? 'bg-success-100 text-success-800' 
              : 'bg-warning-100 text-warning-800'
          }`}>
            {isGoodDeal ? 'OM Price Below Market ✔' : 'OM Price Above Market ⚠'}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <span className="font-medium">Units:</span> {dealData.units.toLocaleString()}
          </div>
          <div>
            <span className="font-medium">Occupancy:</span> {formatPercent(dealData.occupancy)}
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card text-center">
          <div className="metric-label">Purchase Price</div>
          <div className="metric-value text-primary-600">
            {formatCurrency(dealData.purchasePrice)}
          </div>
        </div>

        <div className="card text-center">
          <div className="metric-label">Avg Rent</div>
          <div className="metric-value">
            {formatCurrency(dealData.avgRent)}
          </div>
        </div>

        <div className="card text-center">
          <div className="metric-label">NOI</div>
          <div className="metric-value text-success-600">
            {formatCurrency(dealData.NOI)}
          </div>
        </div>

        <div className="card text-center">
          <div className="metric-label">Cap Rate</div>
          <div className="metric-value">
            {formatPercent(dealData.marketCapRate)}
          </div>
        </div>
      </div>

      {/* Investment Returns */}
      <div className="card">
        <h5 className="text-lg font-semibold text-gray-900 mb-4">Investment Returns</h5>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="metric-label">DSCR</div>
            <div className="metric-value text-success-600">
              {formatRatio(dealData.DSCR)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {dealData.DSCR >= 1.25 ? 'Strong Coverage' : 'Below Target'}
            </p>
          </div>

          <div className="text-center">
            <div className="metric-label">Cash-on-Cash</div>
            <div className="metric-value text-primary-600">
              {formatPercent(dealData.cashOnCashReturn)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {dealData.cashOnCashReturn >= 0.08 ? 'Good Return' : 'Below Target'}
            </p>
          </div>

                     <div className="text-center">
             <div className="metric-label">Levered IRR</div>
             <div className="metric-value text-success-600">
               {formatPercent(dealData.leveredIRR)}
             </div>
             <p className="text-xs text-gray-500 mt-1">
               {dealData.leveredIRR >= 0.15 ? 'Strong IRR' : 'Below Target'}
             </p>
           </div>
         </div>
         
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
           <div className="text-center">
             <div className="metric-label">Unlevered IRR</div>
             <div className="metric-value text-primary-600">
               {formatPercent(dealData.unleveredIRR)}
             </div>
             <p className="text-xs text-gray-500 mt-1">
               Property-level return (no debt)
             </p>
           </div>
           
           <div className="text-center">
             <div className="metric-label">Leverage Impact</div>
             <div className={`metric-value ${
               dealData.leveredIRR > dealData.unleveredIRR ? 'text-success-600' : 'text-warning-600'
             }`}>
               {dealData.leveredIRR > dealData.unleveredIRR ? '+' : ''}
               {formatPercent(dealData.leveredIRR - dealData.unleveredIRR)}
             </div>
             <p className="text-xs text-gray-500 mt-1">
               {dealData.leveredIRR > dealData.unleveredIRR ? 'Debt enhances returns' : 'Debt reduces returns'}
             </p>
           </div>
        </div>
      </div>

      {/* Pro Forma Details */}
      <div className="card">
        <h5 className="text-lg font-semibold text-gray-900 mb-4">Pro Forma Analysis</h5>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Gross Potential Income:</span>
              <span className="font-medium">{formatCurrency(dealData.grossPotentialIncome)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Vacancy ({formatPercent(dealData.vacancy)}):</span>
              <span className="font-medium text-red-600">
                -{formatCurrency(dealData.grossPotentialIncome - dealData.effectiveGrossIncome)}
              </span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-gray-600 font-medium">Effective Gross Income:</span>
              <span className="font-medium text-success-600">
                {formatCurrency(dealData.effectiveGrossIncome)}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Operating Expenses:</span>
              <span className="font-medium text-red-600">
                -{formatCurrency(dealData.operatingExpenses)}
              </span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-gray-600 font-medium">Net Operating Income:</span>
              <span className="font-medium text-success-600">
                {formatCurrency(dealData.NOI)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Cap Rate Valuation:</span>
              <span className="font-medium text-primary-600">
                {formatCurrency(dealData.capRateValuation)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Financing Assumptions */}
      <div className="card">
        <h5 className="text-lg font-semibold text-gray-900 mb-4">Financing Assumptions</h5>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Loan Amount (65% LTV):</span>
              <span className="font-medium">{formatCurrency(dealData.loanAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Equity Investment:</span>
              <span className="font-medium">{formatCurrency(dealData.equity)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Interest Rate:</span>
              <span className="font-medium">6.0%</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Debt Service:</span>
              <span className="font-medium text-red-600">
                {formatCurrency(dealData.debtService)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Amortization:</span>
              <span className="font-medium">30 years</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Market Cap Rate:</span>
              <span className="font-medium">6.0%</span>
            </div>
          </div>
        </div>
      </div>

      {/* IRR Breakdown */}
             <IRRBreakdown 
         irrBreakdown={dealData.irrBreakdown} 
         equity={dealData.equity} 
         leveredIRR={dealData.leveredIRR}
         unleveredIRR={dealData.unleveredIRR}
       />
    </div>
  )
}
