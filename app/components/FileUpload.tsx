'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'

interface FileUploadProps {
  onFileUpload: (omFile: File, rentRollFile?: File) => void
  isLoading: boolean
}

export default function FileUpload({ onFileUpload, isLoading }: FileUploadProps) {
  const [selectedOMFile, setSelectedOMFile] = useState<File | null>(null)
  const [selectedRentRollFile, setSelectedRentRollFile] = useState<File | null>(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0]
      if (file.type === 'application/pdf') {
        setSelectedOMFile(file)
      }
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    multiple: false
  })

  const handleUpload = () => {
    if (selectedOMFile) {
      onFileUpload(selectedOMFile, selectedRentRollFile || undefined)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === 'application/pdf') {
      setSelectedOMFile(file)
    }
  }

  return (
    <div className="card max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-primary-100 mb-4">
          <svg className="h-8 w-8 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Upload Offering Memorandum
        </h3>
        <p className="text-gray-600">
          Drag and drop your PDF OM here, or click to browse
        </p>
        <p className="text-sm text-gray-500 mt-1">
          Upload a rent roll below for more accurate data
        </p>
      </div>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
        }`}
      >
        <input {...getInputProps()} />
        <div className="space-y-4">
          <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div>
            {isDragActive ? (
              <p className="text-primary-600 font-medium">Drop the PDF here...</p>
            ) : (
              <p className="text-gray-600">
                <span className="font-medium text-primary-600">Click to upload</span> or drag and drop
              </p>
            )}
            <p className="text-sm text-gray-500 mt-1">PDF files only, max 10MB</p>
          </div>
        </div>
      </div>

            {/* Rent Roll Upload Section */}
            <div className="text-center mb-6 mt-6">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-3">
          <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h4 className="text-lg font-medium text-gray-900 mb-2">
          Rent Roll (Optional)
        </h4>
        <p className="text-gray-600 text-sm">
          Upload an Excel/CSV rent roll for more accurate occupancy and rent data
        </p>
      </div>

      {/* Rent Roll File Input */}
      <div className="mt-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Rent Roll File (Excel/CSV)
        </label>
        <div className="flex items-center space-x-3">
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) {
                setSelectedRentRollFile(file)
              }
            }}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {selectedRentRollFile && (
            <button
              onClick={() => setSelectedRentRollFile(null)}
              className="text-red-600 hover:text-red-800 text-sm font-medium"
            >
              Remove
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Upload Excel (.xlsx, .xls) or CSV files. This will provide more accurate occupancy and rent data.
        </p>
      </div>

      {selectedOMFile && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-green-800 font-medium">
              Selected OM: {selectedOMFile.name}
            </span>
          </div>
          
          {selectedRentRollFile && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-blue-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-blue-800 font-medium">
                  Rent Roll: {selectedRentRollFile.name}
                </span>
              </div>
              <p className="text-sm text-blue-700 mt-1">
                ✓ Will provide accurate occupancy and rent data
              </p>
            </div>
          )}
          
          <button
            onClick={handleUpload}
            disabled={isLoading}
            className="btn-primary w-full mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Analyzing...' : 'Analyze OM'}
          </button>
        </div>
      )}

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500">
          Your PDF will be processed securely and analyzed using AI to extract key property metrics.
        </p>
      </div>
    </div>
  )
}
