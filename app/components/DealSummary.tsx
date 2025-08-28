'use client'

import { useState } from 'react'
import { DealData, UnderwritingAssumptions } from '../types'
import IRRBreakdown from './IRRBreakdown'
import AssumptionsPanel from './AssumptionsPanel'
import RentRollDisplay from './RentRollDisplay'

interface DealSummaryProps {
  dealData: DealData
}

export default function DealSummary({ dealData }: DealSummaryProps) {
  const [assumptions, setAssumptions] = useState<UnderwritingAssumptions>({
    vacancy: dealData.vacancy,
    expenseRatio: dealData.expenseRatio,
    marketCapRate: dealData.marketCapRate,
    loanToValue: 0.65,
    interestRate: 0.06,
    amortizationYears: 30,
    rentGrowthRate: 0.03,
    expenseGrowthRate: 0.02,
    exitCapRate: 0.065,
    analysisTerm: 5 // Default to 5-year analysis
  })
  const [isRecalculating, setIsRecalculating] = useState(false)
  const [currentDealData, setCurrentDealData] = useState<DealData>(dealData)
  const [selectedPrice, setSelectedPrice] = useState<number>(dealData.purchasePrice)
  const [selectedPriceType, setSelectedPriceType] = useState<'market' | 'whisper' | 'custom'>('market')
  const [rentRollOpen, setRentRollOpen] = useState(false)
  const [assumptionsOpen, setAssumptionsOpen] = useState(false)

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

  const handleAssumptionsChange = async (newAssumptions: UnderwritingAssumptions) => {
    setAssumptions(newAssumptions)
    setIsRecalculating(true)
    
    // Recalculate IRR with new assumptions
    try {
      const response = await fetch('/api/recalculateIRR', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dealData: currentDealData,
          newAssumptions
        }),
      })
      
      if (response.ok) {
        const recalculatedData = await response.json()
        // Update the current deal data with new calculations
        setCurrentDealData(recalculatedData)
        
        // Show success message
        alert('IRR recalculated successfully with new assumptions!')
      } else {
        console.error('Failed to recalculate IRR')
        alert('Failed to recalculate IRR. Please try again.')
      }
    } catch (error) {
      console.error('Error recalculating IRR:', error)
      alert('Error recalculating IRR. Please try again.')
    } finally {
      setIsRecalculating(false)
    }
  }

  const handlePriceChange = async (newPrice: number, priceType: 'market' | 'whisper' | 'custom') => {
    setSelectedPrice(newPrice)
    setSelectedPriceType(priceType)
    setIsRecalculating(true)
    
    // Recalculate IRR with new price
    try {
      const response = await fetch('/api/recalculateIRR', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dealData: currentDealData,
          newAssumptions: assumptions,
          newPrice: newPrice // Pass the new price
        }),
      })
      
      if (response.ok) {
        const recalculatedData = await response.json()
        setCurrentDealData(recalculatedData)
        alert(`IRR recalculated successfully with ${priceType} price!`)
      } else {
        console.error('Failed to recalculate IRR with new price')
        alert('Failed to recalculate IRR. Please try again.')
      }
    } catch (error) {
      console.error('Error recalculating IRR with new price:', error)
      alert('Error recalculating IRR. Please try again.')
    } finally {
      setIsRecalculating(false)
    }
  }

  const isGoodDeal = currentDealData.whisperPrice ? currentDealData.priceDifference < 0 : null

  return (
    <div className="space-y-6">
      {/* Property Header */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-xl font-bold text-gray-900">
            📊 Deal Summary – {currentDealData.propertyName}
          </h4>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            isGoodDeal === null 
              ? 'bg-gray-100 text-gray-800' 
              : isGoodDeal 
                ? 'bg-success-100 text-success-800' 
                : 'bg-warning-100 text-warning-800'
          }`}>
            {isGoodDeal === null 
              ? 'No OM Price Specified' 
              : isGoodDeal 
                ? 'OM Price Below Market ✔' 
                : 'OM Price Above Market ⚠'
            }
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <span className="font-medium">Units:</span> {currentDealData.units.toLocaleString()}
          </div>
          <div>
            <span className="font-medium">Occupancy:</span> {formatPercent(currentDealData.occupancy)}
          </div>
        </div>
      </div>




      
      {isRecalculating && (
        <div className="text-center py-4">
          <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-md">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            Recalculating IRR and financial metrics...
          </div>
        </div>
      )}

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="card text-center">
          <div className="metric-label">Whisper Price</div>
          <div className="metric-value text-gray-600">
            {currentDealData.whisperPrice ? formatCurrency(currentDealData.whisperPrice) : 'Not Specified'}
          </div>
          {selectedPriceType === 'whisper' && currentDealData.whisperPrice && (
            <p className="text-xs text-blue-600 mt-1 font-medium">
              ✓ Currently Selected
            </p>
          )}
        </div>

        <div className="card text-center">
          <div className="metric-label">Market Value</div>
          <div className="metric-value text-primary-600">
            {formatCurrency(currentDealData.purchasePrice)}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Based on NOI ÷ Cap Rate
          </p>
          {selectedPriceType === 'market' && (
            <p className="text-xs text-blue-600 mt-1 font-medium">
              ✓ Currently Selected
            </p>
          )}
        </div>

        <div className="card text-center">
          <div className="metric-label">Price Difference</div>
          <div className={`metric-value ${
            currentDealData.priceDifference > 0 ? 'text-warning-600' : 'text-success-600'
          }`}>
            {currentDealData.whisperPrice ? formatCurrency(currentDealData.priceDifference) : 'N/A'}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {currentDealData.whisperPrice ? 
              (currentDealData.priceDifference > 0 ? 'Above Market' : 'Below Market') : 
              'No OM Price'
            }
          </p>
        </div>

        {selectedPriceType === 'custom' && (
          <div className="card text-center">
            <div className="metric-label">Custom Price</div>
            <div className="metric-value text-purple-600">
              {formatCurrency(selectedPrice)}
            </div>
            <p className="text-xs text-blue-600 mt-1 font-medium">
              ✓ Currently Selected
            </p>
          </div>
        )}


      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="card text-center">
          <div className="metric-label">Cap Rate</div>
          <div className="metric-value">
            {formatPercent(currentDealData.marketCapRate)}
          </div>
        </div>
        <div className="card text-center">
          <div className="metric-label">Avg Rent</div>
          <div className="metric-value">
            {formatCurrency(currentDealData.avgRent)}
          </div>
        </div>

        <div className="card text-center">
          <div className="metric-label">Units</div>
          <div className="metric-value">
            {currentDealData.units.toLocaleString()}
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
              {formatRatio(currentDealData.DSCR)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {currentDealData.DSCR >= 1.25 ? 'Strong Coverage' : 'Below Target'}
            </p>
          </div>

          <div className="text-center">
            <div className="metric-label">Avg Cash-on-Cash</div>
            <div className="metric-value text-primary-600">
              {(() => {
                const annualReturns = currentDealData.irrBreakdown.filter(row => row.year > 0).map(row => row.annualCashOnCash)
                const avgReturn = annualReturns.reduce((sum, ret) => sum + ret, 0) / annualReturns.length
                return formatPercent(avgReturn)
              })()}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {(() => {
                const annualReturns = currentDealData.irrBreakdown.filter(row => row.year > 0).map(row => row.annualCashOnCash)
                const avgReturn = annualReturns.reduce((sum, ret) => sum + ret, 0) / annualReturns.length
                return avgReturn >= 0.08 ? 'Good Return' : 'Below Target'
              })()}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              {currentDealData.irrBreakdown.length - 1}-year average return
            </p>
          </div>

                     <div className="text-center">
             <div className="metric-label">Levered IRR</div>
             <div className="metric-value text-success-600">
               {formatPercent(currentDealData.leveredIRR)}
             </div>
             <p className="text-xs text-gray-500 mt-1">
               {currentDealData.leveredIRR >= 0.15 ? 'Strong IRR' : 'Below Target'}
             </p>
           </div>
         </div>
         
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
           <div className="text-center">
             <div className="metric-label">Unlevered IRR</div>
             <div className="metric-value text-primary-600">
               {formatPercent(currentDealData.unleveredIRR)}
             </div>
             <p className="text-xs text-gray-500 mt-1">
               Property-level return (no debt)
             </p>
           </div>
           
           <div className="text-center">
             <div className="metric-label">Leverage Impact</div>
             <div className={`metric-value ${
               currentDealData.leveredIRR > currentDealData.unleveredIRR ? 'text-success-600' : 'text-warning-600'
             }`}>
               {currentDealData.leveredIRR > currentDealData.unleveredIRR ? '+' : ''}
               {formatPercent(currentDealData.leveredIRR - currentDealData.unleveredIRR)}
             </div>
             <p className="text-xs text-gray-500 mt-1">
               {currentDealData.leveredIRR > currentDealData.unleveredIRR ? 'Debt enhances returns' : 'Debt reduces returns'}
             </p>
           </div>
        </div>
      </div>

      {/* Assumptions Panel - Accordion */}
      <div className="card">
        <button
          onClick={() => setAssumptionsOpen(!assumptionsOpen)}
          className="flex items-center justify-between w-full text-left p-4 hover:bg-gray-50 transition-colors"
        >
          <h5 className="text-lg font-semibold text-gray-900 flex items-center">
            ⚙️ Underwriting Assumptions
            <span className="ml-2 text-sm text-gray-500 font-normal">
              (Click to {assumptionsOpen ? 'collapse' : 'expand'})
            </span>
          </h5>
          <div className="flex items-center">
            <span className="text-sm text-gray-500 mr-2">
              {assumptionsOpen ? 'Collapse' : 'Expand'}
            </span>
            <svg
              className={`w-5 h-5 text-gray-500 transition-transform ${
                assumptionsOpen ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>
        
        {assumptionsOpen && (
          <div className="px-4 pb-4">
            <AssumptionsPanel
              assumptions={assumptions}
              onAssumptionsChange={handleAssumptionsChange}
              isOpen={true}
              onToggle={() => {}}
              isRecalculating={isRecalculating}
              propertyValue={currentDealData.purchasePrice}
              whisperPrice={currentDealData.whisperPrice}
              onPriceChange={(newPrice, priceType) => handlePriceChange(newPrice, priceType)}
            />
          </div>
        )}
      </div>

            {/* Rent Roll Display - Accordion */}
            {currentDealData.rentRollData && (
        <div className="card">
          <button
            onClick={() => setRentRollOpen(!rentRollOpen)}
            className="flex items-center justify-between w-full text-left p-4 hover:bg-gray-50 transition-colors"
          >
            <h5 className="text-lg font-semibold text-gray-900 flex items-center">
              📊 Rent Roll Analysis
              <span className="ml-2 text-sm text-gray-500 font-normal">
                ({currentDealData.rentRollData.totalUnits} units, {formatCurrency(currentDealData.rentRollData.totalMonthlyRent)}/month)
              </span>
            </h5>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 mr-2">
                {rentRollOpen ? 'Collapse' : 'Expand'}
              </span>
              <svg
                className={`w-5 h-5 text-gray-500 transition-transform ${
                  rentRollOpen ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>
          
          {rentRollOpen && (
            <div className="px-4 pb-4">
              <RentRollDisplay rentRollData={currentDealData.rentRollData} />
            </div>
          )}
        </div>
      )}

      {/* IRR Breakdown */}
      <IRRBreakdown 
        irrBreakdown={currentDealData.irrBreakdown}
        dealData={currentDealData}
      />
    </div>
  )
}

