'use client'
// Vercel rebuild fix - added comment to trigger clean deployment

import { useState } from 'react'
import FileUpload from './components/FileUpload'
import DealSummary from './components/DealSummary'
import { DealData, UserAssumptions } from './types'
import { ExtractedData } from './lib/pdfProcessor'

export default function Home() {
  const [dealData, setDealData] = useState<DealData | null>(null)
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileUpload = async (omFileUrl: string, rentRollFileUrl?: string, userAssumptions?: UserAssumptions, extractedData?: ExtractedData) => {
    setIsLoading(true)
    setError(null)
    
    // Set extracted data immediately for instant display
    if (extractedData) {
      setExtractedData(extractedData)
    }
    
    try {
      const response = await fetch('/api/parseOM', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          omFileUrl,
          rentRollFileUrl,
          userAssumptions
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      setDealData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          First-Pass CRE Underwriting
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Upload an Offering Memorandum (OM) to get instant underwriting analysis with key metrics, 
          pro forma calculations, and investment returns.
        </p>
      </div>

      {!dealData && (
        <FileUpload onFileUpload={handleFileUpload} isLoading={isLoading} />
      )}

      {/* Show extracted data immediately after processing */}
      {extractedData && !dealData && !isLoading && (
        <div className="max-w-4xl mx-auto">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              📊 Quick Data Extraction
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {extractedData.propertyName && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-sm font-medium text-blue-800">Property Name</div>
                  <div className="text-lg font-semibold text-blue-900">{extractedData.propertyName}</div>
                </div>
              )}
              {extractedData.totalUnits && (
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="text-sm font-medium text-green-800">Total Units</div>
                  <div className="text-lg font-semibold text-green-900">{extractedData.totalUnits}</div>
                </div>
              )}
              {extractedData.capRate && (
                <div className="bg-purple-50 p-3 rounded-lg">
                  <div className="text-sm font-medium text-purple-800">Cap Rate</div>
                  <div className="text-lg font-semibold text-purple-900">{(extractedData.capRate * 100).toFixed(1)}%</div>
                </div>
              )}
              {extractedData.noi && (
                <div className="bg-orange-50 p-3 rounded-lg">
                  <div className="text-sm font-medium text-orange-800">NOI</div>
                  <div className="text-lg font-semibold text-orange-900">${extractedData.noi.toLocaleString()}</div>
                </div>
              )}
              {extractedData.totalRent && (
                <div className="bg-indigo-50 p-3 rounded-lg">
                  <div className="text-sm font-medium text-indigo-800">Total Rent</div>
                  <div className="text-lg font-semibold text-indigo-900">${extractedData.totalRent.toLocaleString()}</div>
                </div>
              )}
              {extractedData.occupancyRate && (
                <div className="bg-teal-50 p-3 rounded-lg">
                  <div className="text-sm font-medium text-teal-800">Occupancy</div>
                  <div className="text-lg font-semibold text-teal-900">{(extractedData.occupancyRate * 100).toFixed(1)}%</div>
                </div>
              )}
            </div>
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Processing complete!</strong> Your file is now being analyzed for detailed underwriting calculations. 
                This may take a few moments.
              </p>
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-lg text-gray-600">Analyzing your OM...</p>
            <p className="text-sm text-gray-500 mt-2">This may take a few moments</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {dealData && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-bold text-gray-900">Deal Analysis Complete</h3>
            <button
              onClick={() => {
                setDealData(null)
                setExtractedData(null)
              }}
              className="btn-primary"
            >
              Analyze Another OM
            </button>
          </div>
          <DealSummary dealData={dealData} />
        </div>
      )}
    </div>
  )
}
