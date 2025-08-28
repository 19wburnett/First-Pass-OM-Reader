'use client'

import { useState, useEffect } from 'react'
import { UnderwritingAssumptions } from '../types'
import { useRouter } from 'next/navigation'

interface AssumptionsPanelProps {
  assumptions: UnderwritingAssumptions
  onAssumptionsChange: (assumptions: UnderwritingAssumptions) => void
  isOpen: boolean
  onToggle: () => void
  isRecalculating?: boolean
  propertyValue?: number // Add actual property value from deal
  whisperPrice?: number // Add whisper price from OM
  onPriceChange?: (price: number, priceType: 'market' | 'whisper' | 'custom') => void // Add callback for price changes
}

export default function AssumptionsPanel({ 
  assumptions, 
  onAssumptionsChange, 
  isOpen, 
  onToggle,
  isRecalculating,
  propertyValue,
  whisperPrice,
  onPriceChange
}: AssumptionsPanelProps) {
  const [localAssumptions, setLocalAssumptions] = useState<UnderwritingAssumptions>(assumptions)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedPriceType, setSelectedPriceType] = useState<'whisper' | 'market' | 'custom'>('market')
  const [customPrice, setCustomPrice] = useState<number>(propertyValue || 0)
  const router = useRouter()

  // Calculate debt amounts based on selected price type
  const calculateDebtAmounts = (assumptions: UnderwritingAssumptions) => {
    let value: number
    
    switch (selectedPriceType) {
      case 'whisper':
        value = whisperPrice || propertyValue || 1000000
        break
      case 'custom':
        value = customPrice || propertyValue || 1000000
        break
      case 'market':
      default:
        value = propertyValue || 1000000
        break
    }
    
    const loanAmount = value * assumptions.loanToValue
    const equity = value - loanAmount
    
    // Calculate monthly payment
    const monthlyRate = assumptions.interestRate / 12
    const totalPayments = assumptions.amortizationYears * 12
    
    if (monthlyRate === 0) return { loanAmount: 0, equity: 0, monthlyPayment: 0, annualDebtService: 0 }
    
    const monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) / 
                          (Math.pow(1 + monthlyRate, totalPayments) - 1)
    const annualDebtService = monthlyPayment * 12
    
    return { loanAmount, equity, monthlyPayment, annualDebtService }
  }

  useEffect(() => {
    setLocalAssumptions(assumptions)
  }, [assumptions])

  useEffect(() => {
    // Initialize custom price with property value if available
    if (propertyValue && customPrice === 0) {
      setCustomPrice(propertyValue)
    }
  }, [propertyValue, customPrice])

  const handleChange = (field: keyof UnderwritingAssumptions, value: number) => {
    const newAssumptions = { ...localAssumptions, [field]: value }
    setLocalAssumptions(newAssumptions)
  }

  const handlePriceTypeChange = (priceType: 'whisper' | 'market' | 'custom') => {
    setSelectedPriceType(priceType)
    
    // Notify parent component of price change
    if (onPriceChange) {
      let newPrice: number
      switch (priceType) {
        case 'whisper':
          newPrice = whisperPrice || propertyValue || 0
          break
        case 'custom':
          newPrice = customPrice || propertyValue || 0
          break
        case 'market':
        default:
          newPrice = propertyValue || 0
          break
      }
      onPriceChange(newPrice, priceType)
    }
  }

  const handleCustomPriceChange = (value: number) => {
    setCustomPrice(value)
    if (selectedPriceType === 'custom' && onPriceChange) {
      onPriceChange(value, 'custom')
    }
  }

  const handleApplyChanges = () => {
    onAssumptionsChange(localAssumptions)
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setLocalAssumptions(assumptions) // Reset to original values
    setIsEditing(false)
  }

  const resetToDefaults = () => {
    const defaults: UnderwritingAssumptions = {
      vacancy: 0.05,
      expenseRatio: 0.35,
      marketCapRate: 0.06,
      loanToValue: 0.65,
      interestRate: 0.06,
      amortizationYears: 30,
      rentGrowthRate: 0.03,
      expenseGrowthRate: 0.02,
      exitCapRate: 0.065,
      analysisTerm: 5
    }
    setLocalAssumptions(defaults)
    onAssumptionsChange(defaults)
  }

  return (
    <div className="card mb-6">
      <div className="flex items-center justify-between mb-4">
        <h5 className="text-lg font-semibold text-gray-900">Underwriting Assumptions</h5>
        <div className="flex space-x-2">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="text-primary-600 hover:text-primary-700 font-medium px-3 py-1 border border-primary-600 rounded-md hover:bg-primary-50"
            >
              ✏️ Edit Assumptions
            </button>
          ) : (
            <>
              <button
                onClick={handleCancelEdit}
                className="text-gray-600 hover:text-gray-700 font-medium px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyChanges}
                disabled={isRecalculating}
                className={`text-white font-medium px-3 py-1 border border-transparent rounded-md ${
                  isRecalculating 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-primary-600 hover:bg-primary-700'
                }`}
              >
                {isRecalculating ? '🔄 Recalculating...' : 'Apply Changes'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* IRR Assumptions */}
        <div>
          <h6 className="text-md font-medium text-gray-700 mb-3">IRR Calculation Assumptions</h6>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Vacancy Rate
              </label>
              {isEditing ? (
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={localAssumptions.vacancy}
                    onChange={(e) => handleChange('vacancy', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <span className="absolute right-3 top-2 text-gray-500">%</span>
                </div>
              ) : (
                <div className="text-lg font-medium text-gray-900">
                  {Math.round(assumptions.vacancy * 100)}%
                </div>
              )}
            </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Expense Ratio
                </label>
                {isEditing ? (
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={localAssumptions.expenseRatio}
                      onChange={(e) => handleChange('expenseRatio', parseFloat(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <span className="absolute right-3 top-2 text-gray-500">%</span>
                  </div>
                ) : (
                  <div className="text-lg font-medium text-gray-900">
                    {Math.round(assumptions.expenseRatio * 100)}%
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Market Cap Rate
                </label>
                {isEditing ? (
                  <div className="relative">
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      max="0.2"
                      value={localAssumptions.marketCapRate}
                      onChange={(e) => handleChange('marketCapRate', parseFloat(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <span className="absolute right-3 top-2 text-gray-500">%</span>
                  </div>
                ) : (
                  <div className="text-lg font-medium text-gray-900">
                    {(assumptions.marketCapRate * 100).toFixed(1)}%
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Rent Growth (Annual)
                </label>
                {isEditing ? (
                  <div className="relative">
                    <input
                      type="number"
                      step="0.001"
                      min="-0.1"
                      max="0.2"
                      value={localAssumptions.rentGrowthRate}
                      onChange={(e) => handleChange('rentGrowthRate', parseFloat(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <span className="absolute right-3 top-2 text-gray-500">%</span>
                  </div>
                ) : (
                  <div className="text-lg font-medium text-gray-900">
                    {(assumptions.rentGrowthRate * 100).toFixed(1)}%
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Expense Growth (Annual)
                </label>
                {isEditing ? (
                  <div className="relative">
                    <input
                      type="number"
                      step="0.001"
                      min="-0.1"
                      max="0.2"
                      value={localAssumptions.expenseGrowthRate}
                      onChange={(e) => handleChange('expenseGrowthRate', parseFloat(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <span className="absolute right-3 top-2 text-gray-500">%</span>
                  </div>
                ) : (
                  <div className="text-lg font-medium text-gray-900">
                    {(assumptions.expenseGrowthRate * 100).toFixed(1)}%
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Exit Cap Rate
                </label>
                {isEditing ? (
                  <div className="relative">
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      max="0.2"
                      value={localAssumptions.exitCapRate}
                      onChange={(e) => handleChange('exitCapRate', parseFloat(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <span className="absolute right-3 py-2 text-gray-500">%</span>
                  </div>
                ) : (
                  <div className="text-lg font-medium text-gray-900">
                    {(assumptions.exitCapRate * 100).toFixed(1)}%
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Analysis Term (Years)
                </label>
                {isEditing ? (
                  <input
                    type="number"
                    step="1"
                    min="1"
                    max="30"
                    value={localAssumptions.analysisTerm}
                    onChange={(e) => handleChange('analysisTerm', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                ) : (
                  <div className="text-lg font-medium text-gray-900">
                    {assumptions.analysisTerm} years
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Financing Assumptions */}
          <div>
            <h6 className="text-md font-medium text-gray-700 mb-3">Financing Assumptions</h6>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Loan-to-Value (LTV)
                </label>
                {isEditing ? (
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={localAssumptions.loanToValue}
                      onChange={(e) => handleChange('loanToValue', parseFloat(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <span className="absolute right-3 top-2 text-gray-500">%</span>
                  </div>
                ) : (
                  <div className="text-lg font-medium text-gray-900">
                    {Math.round(assumptions.loanToValue * 100)}%
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Interest Rate
                </label>
                {isEditing ? (
                  <div className="relative">
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      max="0.2"
                      value={localAssumptions.interestRate}
                      onChange={(e) => handleChange('interestRate', parseFloat(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <span className="absolute right-3 top-2 text-gray-500">%</span>
                  </div>
                ) : (
                  <div className="text-lg font-medium text-gray-900">
                    {(assumptions.interestRate * 100).toFixed(1)}%
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Amortization (Years)
                </label>
                {isEditing ? (
                  <input
                    type="number"
                    step="1"
                    min="1"
                    max="50"
                    value={localAssumptions.amortizationYears}
                    onChange={(e) => handleChange('amortizationYears', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                ) : (
                  <div className="text-lg font-medium text-gray-900">
                    {assumptions.amortizationYears} years
                  </div>
                )}
              </div>
            </div>
          </div>

                                                                                                                                       {/* Price Selection */}
            <div>
              <h6 className="text-md font-medium text-gray-700 mb-3">Price Selection for Analysis</h6>
              <div className="space-y-3">
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="priceType"
                      value="market"
                      checked={selectedPriceType === 'market'}
                      onChange={() => handlePriceTypeChange('market')}
                      className="mr-2"
                    />
                    <span className="text-sm">
                      Market Value: ${propertyValue ? propertyValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : 'N/A'}
                    </span>
                  </label>
                  
                  {whisperPrice && (
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="priceType"
                        value="whisper"
                        checked={selectedPriceType === 'whisper'}
                        onChange={() => handlePriceTypeChange('whisper')}
                        className="mr-2"
                      />
                      <span className="text-sm">
                        Whisper Price: ${whisperPrice.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </span>
                    </label>
                  )}
                  
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="priceType"
                      value="custom"
                      checked={selectedPriceType === 'custom'}
                      onChange={() => handlePriceTypeChange('custom')}
                      className="mr-2"
                    />
                    <span className="text-sm">Custom Price</span>
                  </label>
                </div>
                
                {selectedPriceType === 'custom' && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Custom Price:</span>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-500">$</span>
                      <input
                        type="number"
                        value={customPrice}
                        onChange={(e) => handleCustomPriceChange(parseFloat(e.target.value) || 0)}
                        className="pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Enter price"
                        min="0"
                        step="1000"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

                                                                    {/* Debt Breakdown */}
            <div>
              <h6 className="text-md font-medium text-gray-700 mb-3">Debt Breakdown</h6>
              <p className="text-xs text-gray-500 mb-3">
                💡 Based on {(() => {
                  let value: number
                  switch (selectedPriceType) {
                    case 'whisper':
                      value = whisperPrice || propertyValue || 0
                      break
                    case 'custom':
                      value = customPrice || propertyValue || 0
                      break
                    case 'market':
                    default:
                      value = propertyValue || 0
                      break
                  }
                  return value > 0 ? `$${(value / 1000000).toFixed(1)}M` : '$1M example'
                })()} property value
                {(() => {
                  let value: number
                  switch (selectedPriceType) {
                    case 'whisper':
                      value = whisperPrice || propertyValue || 0
                      break
                    case 'custom':
                      value = customPrice || propertyValue || 0
                      break
                    case 'market':
                    default:
                      value = propertyValue || 0
                      break
                  }
                  return value > 0 ? (
                    <span className="ml-2 text-blue-600">
                      (Selected Price: ${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })})
                    </span>
                  ) : null
                })()}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-3">
                                   <div className="flex justify-between">
                    <span className="text-gray-600">Loan Amount:</span>
                    <span className="font-medium">
                      {isEditing ? (
                        <span className="text-gray-400">Calculated from LTV</span>
                      ) : (
                        `$${calculateDebtAmounts(assumptions).loanAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Equity Investment:</span>
                    <span className="font-medium">
                      {isEditing ? (
                        <span className="text-gray-400">Calculated from LTV</span>
                      ) : (
                        `$${calculateDebtAmounts(assumptions).equity.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Monthly Payment:</span>
                    <span className="font-medium">
                      {isEditing ? (
                        <span className="text-gray-400">Calculated from terms</span>
                      ) : (
                        `$${calculateDebtAmounts(assumptions).monthlyPayment.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/month`
                      )}
                    </span>
                  </div>
               </div>
               
               <div className="space-y-3">
                 <div className="flex justify-between">
                   <span className="text-gray-600">Annual Debt Service:</span>
                   <span className="font-medium">
                     {isEditing ? (
                       <span className="text-gray-400">Calculated from terms</span>
                     ) : (
                       `$${calculateDebtAmounts(assumptions).annualDebtService.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/year`
                     )}
                   </span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-gray-600">Interest Rate:</span>
                   <span className="font-medium">
                     {isEditing ? (
                       <span className="text-gray-400">Set above</span>
                     ) : (
                       `${(assumptions.interestRate * 100).toFixed(1)}%`
                     )}
                   </span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-gray-600">LTV Ratio:</span>
                   <span className="font-medium">
                     {isEditing ? (
                       <span className="text-gray-400">Set above</span>
                     ) : (
                       `${(assumptions.loanToValue * 100).toFixed(0)}%`
                     )}
                   </span>
                 </div>
               </div>
             </div>
           </div>

           {/* Reset Button */}
           {isEditing && (
             <div className="flex justify-end pt-4 border-t">
               <button
                 onClick={resetToDefaults}
                 className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
               >
                 Reset to Defaults
               </button>
             </div>
           )}
         </div>
     </div>
   )
 }
