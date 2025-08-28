'use client'

import { RentRollData } from '../types'

interface RentRollDisplayProps {
  rentRollData: RentRollData
}

export default function RentRollDisplay({ rentRollData }: RentRollDisplayProps) {
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

  return (
    <div className="card mb-6">
      <div className="flex items-center justify-between mb-4">
        <h5 className="text-lg font-semibold text-gray-900">
          📊 Rent Roll Analysis
        </h5>
        <div className="text-sm text-green-600 font-medium">
          ✓ Using Actual Data
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{rentRollData.totalUnits}</div>
          <div className="text-sm text-gray-600">Total Units</div>
        </div>
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{rentRollData.occupiedUnits}</div>
          <div className="text-sm text-gray-600">Occupied</div>
        </div>
        <div className="text-center p-3 bg-red-50 rounded-lg">
          <div className="text-2xl font-bold text-red-600">{rentRollData.vacantUnits}</div>
          <div className="text-sm text-gray-600">Vacant</div>
        </div>
        <div className="text-center p-3 bg-purple-50 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">{formatPercent(rentRollData.occupancyRate)}</div>
          <div className="text-sm text-gray-600">Occupancy Rate</div>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="text-sm font-medium text-gray-600 mb-1">Total Monthly Rent</div>
          <div className="text-xl font-bold text-gray-900">{formatCurrency(rentRollData.totalMonthlyRent)}</div>
          <div className="text-sm text-gray-500">All units combined</div>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="text-sm font-medium text-gray-600 mb-1">Average Monthly Rent</div>
          <div className="text-xl font-bold text-gray-900">{formatCurrency(rentRollData.averageMonthlyRent)}</div>
          <div className="text-sm text-gray-500">Per unit</div>
        </div>
      </div>

      {/* Unit Breakdown Table */}
      <div className="overflow-x-auto">
        <h6 className="text-md font-medium text-gray-700 mb-3">Unit Breakdown</h6>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Unit
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Monthly Rent
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tenant
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rentRollData.units.slice(0, 10).map((unit, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                  {unit.unitNumber}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">
                  {unit.unitType}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-green-600 font-medium">
                  {formatCurrency(unit.monthlyRent)}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    unit.status === 'occupied' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {unit.status}
                  </span>
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">
                  {unit.tenantName || '-'}
                </td>
              </tr>
            ))}
            {rentRollData.units.length > 10 && (
              <tr>
                <td colSpan={5} className="px-3 py-2 text-center text-sm text-gray-500">
                  ... and {rentRollData.units.length - 10} more units
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-xs text-gray-500">
        💡 This rent roll data provides more accurate occupancy and rent information than what could be extracted from the OM text.
      </div>
    </div>
  )
}
