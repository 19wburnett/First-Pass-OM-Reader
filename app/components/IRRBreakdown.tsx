'use client'

import { IRRBreakdown as IRRBreakdownType, DealData } from '../types'

interface IRRBreakdownProps {
  irrBreakdown: IRRBreakdownType[]
  dealData: DealData
}

export default function IRRBreakdown({ irrBreakdown, dealData }: IRRBreakdownProps) {
  const { equity, leveredIRR, unleveredIRR } = dealData
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

     const exportToExcel = () => {
     // Create CSV content with the new table structure
     const headers = [
       'Line Item',
       ...irrBreakdown.map(row => `Year ${row.year}`)
     ]
     
                       const lineItems = [
         'Gross Income',
         'OP Expenses',
         'NOI',
         'Purchase of Property',
         'Sale of Property',
         'Unlevered Cash Flow',
         'Debt Service',
         'Remaining Debt',
         'Sale of Property (Net)',
         'Levered Cash Flow',
         'Annual Cash on Cash'
       ]
     
     const csvContent = [
       headers.join(','),
       ...lineItems.map((item, index) => {
         const row = [item]
         
         // Add data for each year based on the line item
         for (let yearIndex = 0; yearIndex < irrBreakdown.length; yearIndex++) {
           const yearData = irrBreakdown[yearIndex]
           if (!yearData) {
             row.push('')
             continue
           }
           
           switch (index) {
             case 0: // Gross Income
               row.push(yearData.year === 0 ? '-' : yearData.grossIncome.toFixed(2))
               break
             case 1: // OP Expenses
               row.push(yearData.year === 0 ? '-' : yearData.operatingExpenses.toFixed(2))
               break
             case 2: // NOI
               row.push(yearData.year === 0 ? '-' : yearData.NOI.toFixed(2))
               break
             case 3: // Purchase of Property
               row.push(yearData.year === 0 ? (-irrBreakdown[0].propertyValue).toFixed(2) : '-')
               break
             case 4: // Sale of Property
               row.push(yearData.year === irrBreakdown[irrBreakdown.length - 1].year ? yearData.propertyValue.toFixed(2) : '-')
               break
             case 5: // Unlevered Cash Flow
               row.push(yearData.year === 0 ? (-irrBreakdown[0].propertyValue).toFixed(2) : 
                       yearData.year === irrBreakdown[irrBreakdown.length - 1].year ? (yearData.cashFlowBeforeDebt + yearData.propertyValue).toFixed(2) : 
                       yearData.cashFlowBeforeDebt.toFixed(2))
               break
             case 6: // Debt Service
               row.push(yearData.year === 0 ? '-' : yearData.debtService.toFixed(2))
               break
             case 7: // Remaining Debt
               row.push(yearData.remainingDebt.toFixed(2))
               break
             case 8: // Sale of Property (Net)
               row.push(yearData.year === irrBreakdown[irrBreakdown.length - 1].year ? (yearData.propertyValue - yearData.remainingDebt).toFixed(2) : '-')
               break
             case 9: // Levered Cash Flow
               row.push(yearData.year === 0 ? (-irrBreakdown[0].propertyValue + irrBreakdown[0].remainingDebt).toFixed(2) : 
                       yearData.year === irrBreakdown[irrBreakdown.length - 1].year ? (yearData.cashFlowAfterDebt + (yearData.propertyValue - yearData.remainingDebt)).toFixed(2) : 
                       yearData.cashFlowAfterDebt.toFixed(2))
               break
             case 10: // Annual Cash on Cash
               row.push(yearData.year === 0 ? '-' : (yearData.annualCashOnCash * 100).toFixed(2) + '%')
               break
             default:
               row.push('')
           }
         }
         
         return row.join(',')
       })
     ].join('\n')

    // Add summary section
    const summaryRows = [
      '',
      'Summary',
      '',
      '',
      '',
      '',
      '',
      `Initial Equity Investment,${(-equity).toFixed(2)}`,
      `Final Year Exit Equity,${irrBreakdown[irrBreakdown.length - 1]?.exitEquity.toFixed(2) || '0.00'}`,
      `Total Operating Cash Flow (No Debt),${irrBreakdown[irrBreakdown.length - 1]?.cumulativeCashFlowBeforeDebt.toFixed(2) || '0.00'}`,
      `Total Operating Cash Flow (With Debt),${irrBreakdown[irrBreakdown.length - 1]?.cumulativeCashFlowAfterDebt.toFixed(2) || '0.00'}`,
             `Levered IRR,${(leveredIRR * 100).toFixed(2)}%`,
       `Unlevered IRR,${(unleveredIRR * 100).toFixed(2)}%`,
              `Average Cash on Cash,${(() => {
          const annualReturns = irrBreakdown.filter(row => row.year > 0).map(row => row.annualCashOnCash)
          const avgReturn = annualReturns.reduce((sum, ret) => sum + ret, 0) / annualReturns.length
          return (avgReturn * 100).toFixed(2)
        })()}%`,
       '',
       'Pricing Analysis',
       `Whisper Price (OM),${dealData.whisperPrice ? dealData.whisperPrice.toFixed(2) : 'Not Specified'}`,
       `Market Value (NOI ÷ Cap Rate),${dealData.purchasePrice.toFixed(2)}`,
       `Price Difference,${dealData.priceDifference.toFixed(2)}`,
       `Price Status,${dealData.priceDifference > 0 ? 'Above Market' : dealData.priceDifference < 0 ? 'Below Market' : 'At Market'}`,
       '',
       'Key Assumptions',
       'Rent Growth: 3% annually',
       'Expense Growth: 2% annually', 
       'Market Cap Rate: 6%',
       'Loan: 65% LTV, 6% interest',
       '30-year amortization',
       'Exit Cap Rate: 6.5%'
    ]
    
    const fullCsvContent = csvContent + '\n' + summaryRows.join('\n')

    // Create and download file
    const blob = new Blob([fullCsvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'IRR_Breakdown.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="card">
              <div className="flex items-center justify-between mb-4">
          <div>
                    <h5 className="text-lg font-semibold text-gray-900">
          📊 {dealData.irrBreakdown.length - 1}-Year IRR Calculation Breakdown (Levered & Unlevered)
        </h5>
          </div>
          <button
            onClick={exportToExcel}
            className="btn-primary text-sm px-4 py-2"
            title="Export to Excel (CSV)"
          >
            📊 Export to Excel
          </button>
        </div>
      
             <div className="overflow-x-auto">
         <table className="min-w-full divide-y divide-gray-200">
           <thead className="bg-gray-50">
             <tr>
               <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                 Line Item
               </th>
               {irrBreakdown.map((row) => (
                 <th key={row.year} className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                   Year {row.year}
                 </th>
               ))}
             </tr>
           </thead>
           <tbody className="bg-white divide-y divide-gray-200">
             <tr className="bg-gray-50">
               <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                 Gross Income
               </td>
               {irrBreakdown.map((row) => (
                 <td key={row.year} className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-center">
                   {row.year === 0 ? '-' : formatCurrency(row.grossIncome)}
                 </td>
               ))}
             </tr>
             <tr>
               <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                 OP Expenses
               </td>
               {irrBreakdown.map((row) => (
                 <td key={row.year} className="px-3 py-2 whitespace-nowrap text-sm text-red-600 text-center">
                   {row.year === 0 ? '-' : formatCurrency(row.operatingExpenses)}
                 </td>
               ))}
             </tr>
             <tr className="bg-gray-50">
               <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                 NOI
               </td>
               {irrBreakdown.map((row) => (
                 <td key={row.year} className="px-3 py-2 whitespace-nowrap text-sm text-green-600 font-medium text-center">
                   {row.year === 0 ? '-' : formatCurrency(row.NOI)}
                 </td>
               ))}
             </tr>
             <tr>
               <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                 Purchase of Property
               </td>
               {irrBreakdown.map((row) => (
                 <td key={row.year} className="px-3 py-2 whitespace-nowrap text-sm text-red-600 text-center">
                   {row.year === 0 ? formatCurrency(-irrBreakdown[0].propertyValue) : '-'}
                 </td>
               ))}
             </tr>
                                         <tr className="bg-gray-50">
                <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                  Sale of Property
                </td>
                {irrBreakdown.map((row) => (
                  <td key={row.year} className="px-3 py-2 whitespace-nowrap text-sm text-green-600 font-medium text-center">
                    {row.year === irrBreakdown[irrBreakdown.length - 1].year ? formatCurrency(row.propertyValue) : '-'}
                  </td>
                ))}
              </tr>
              <tr className="bg-blue-50 border-t-2 border-blue-200">
                <td className="px-3 py-2 whitespace-nowrap text-sm font-bold text-blue-900">
                  Unlevered Cash Flow
                </td>
                {irrBreakdown.map((row) => (
                  <td key={row.year} className={`px-3 py-2 whitespace-nowrap text-sm font-bold text-center ${
                    row.year === 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {row.year === 0 ? formatCurrency(-irrBreakdown[0].propertyValue) : 
                     row.year === irrBreakdown[irrBreakdown.length - 1].year ? formatCurrency(row.cashFlowBeforeDebt + row.propertyValue) : 
                     formatCurrency(row.cashFlowBeforeDebt)}
                  </td>
                ))}
              </tr>
             <tr>
               <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                 Debt Service
               </td>
               {irrBreakdown.map((row) => (
                 <td key={row.year} className="px-3 py-2 whitespace-nowrap text-sm text-red-600 text-center">
                   {row.year === 0 ? '-' : formatCurrency(row.debtService)}
                 </td>
               ))}
             </tr>
             <tr className="bg-gray-50">
               <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                 Remaining Debt
               </td>
               {irrBreakdown.map((row) => (
                 <td key={row.year} className="px-3 py-2 whitespace-nowrap text-sm text-gray-600 text-center">
                   {formatCurrency(row.remainingDebt)}
                 </td>
               ))}
             </tr>
                           <tr className="bg-gray-50">
                <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                  Sale of Property (Net)
                </td>
                {irrBreakdown.map((row) => (
                  <td key={row.year} className="px-3 py-2 whitespace-nowrap text-sm text-green-600 font-medium text-center">
                    {row.year === irrBreakdown[irrBreakdown.length - 1].year ? formatCurrency(row.propertyValue - row.remainingDebt) : '-'}
                  </td>
                ))}
              </tr>
                             <tr className="bg-green-50 border-t-2 border-green-200">
                 <td className="px-3 py-2 whitespace-nowrap text-sm font-bold text-green-900">
                   Levered Cash Flow
                 </td>
                 {irrBreakdown.map((row) => (
                   <td key={row.year} className={`px-3 py-2 whitespace-nowrap text-sm font-bold text-center ${
                     row.year === 0 ? 'text-red-600' : 'text-green-600'
                   }`}>
                     {row.year === 0 ? formatCurrency(-irrBreakdown[0].propertyValue + irrBreakdown[0].remainingDebt) : 
                      row.year === irrBreakdown[irrBreakdown.length - 1].year ? formatCurrency(row.cashFlowAfterDebt + (row.propertyValue - row.remainingDebt)) : 
                      formatCurrency(row.cashFlowAfterDebt)}
                   </td>
                 ))}
               </tr>
               <tr className="bg-yellow-50 border-t-2 border-yellow-200">
                 <td className="px-3 py-2 whitespace-nowrap text-sm font-bold text-yellow-900">
                   Annual Cash on Cash
                 </td>
                 {irrBreakdown.map((row) => (
                   <td key={row.year} className={`px-3 py-2 whitespace-nowrap text-sm font-bold text-center ${
                     row.year === 0 ? 'text-gray-400' : 'text-yellow-700'
                   }`}>
                     {row.year === 0 ? '-' : `${(row.annualCashOnCash * 100).toFixed(1)}%`}
                   </td>
                 ))}
               </tr>
           </tbody>
         </table>
       </div>

      {/* Summary Section */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h6 className="text-sm font-semibold text-gray-900 mb-3">Calculation Summary</h6>
        <p className="text-xs text-gray-600 mb-3">
          Note: The {irrBreakdown.length - 1}-Year IRR is calculated using the proper IRR algorithm (same as Excel's IRR function), 
          not by simply dividing total return by equity.
        </p>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
           <div>
             <span className="font-medium text-gray-600">Initial Equity Investment:</span>
             <span className="ml-2 text-red-600 font-medium">
               {formatCurrency(-equity)}
             </span>
           </div>
           <div>
             <span className="font-medium text-gray-600">Final Year Exit Equity:</span>
             <span className="ml-2 text-green-600 font-medium">
               {formatCurrency(irrBreakdown[5]?.exitEquity || 0)}
             </span>
           </div>
           <div>
             <span className="font-medium text-gray-600">Levered IRR:</span>
             <span className="ml-2 text-blue-600 font-bold">
               {formatPercent(leveredIRR)}
             </span>
           </div>
           <div>
             <span className="font-medium text-gray-600">Average Cash on Cash:</span>
             <span className="ml-2 text-yellow-600 font-bold">
               {(() => {
                 const annualReturns = irrBreakdown.filter(row => row.year > 0).map(row => row.annualCashOnCash)
                 const avgReturn = annualReturns.reduce((sum, ret) => sum + ret, 0) / annualReturns.length
                 return `${(avgReturn * 100).toFixed(1)}%`
               })()}
             </span>
           </div>
         </div>
      </div>

    </div>
  )
}
