'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'

interface FileUploadProps {
  onFileUpload: (omFileUrl: string, rentRollFileUrl?: string) => void
  isLoading: boolean
}

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB in bytes (Supabase can handle this)
const WARNING_FILE_SIZE = 10 * 1024 * 1024 // 10MB warning threshold

export default function FileUpload({ onFileUpload, isLoading }: FileUploadProps) {
  const [selectedOMFile, setSelectedOMFile] = useState<File | null>(null)
  const [selectedRentRollFile, setSelectedRentRollFile] = useState<File | null>(null)
  const [fileSizeWarning, setFileSizeWarning] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<{ om: number; rentRoll: number }>({ om: 0, rentRoll: 0 })
  const [uploadError, setUploadError] = useState<string | null>(null)

  const validateFileSize = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds maximum allowed size of 100MB`
    }
    if (file.size > WARNING_FILE_SIZE) {
      return `Large file detected (${(file.size / (1024 * 1024)).toFixed(1)}MB). Upload may take longer than usual.`
    }
    return null
  }

  const uploadFileToSupabase = async (file: File, fileType: 'om' | 'rentRoll'): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('fileType', fileType)

    const response = await fetch('/api/uploadFile', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Upload failed')
    }

    const data = await response.json()
    return data.publicUrl
  }

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0]
      if (file.type === 'application/pdf') {
        const sizeError = validateFileSize(file)
        if (sizeError && file.size > MAX_FILE_SIZE) {
          alert(sizeError)
          return
        }
        setSelectedOMFile(file)
        setFileSizeWarning(sizeError)
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

  const handleUpload = async () => {
    if (!selectedOMFile) return

    setUploadError(null)
    setUploadProgress({ om: 0, rentRoll: 0 })

    try {
      // Upload OM file first
      setUploadProgress(prev => ({ ...prev, om: 10 }))
      const omFileUrl = await uploadFileToSupabase(selectedOMFile, 'om')
      setUploadProgress(prev => ({ ...prev, om: 100 }))

      let rentRollFileUrl: string | undefined
      
      // Upload rent roll file if provided
      if (selectedRentRollFile) {
        setUploadProgress(prev => ({ ...prev, rentRoll: 10 }))
        rentRollFileUrl = await uploadFileToSupabase(selectedRentRollFile, 'rentRoll')
        setUploadProgress(prev => ({ ...prev, rentRoll: 100 }))
      }

      // Call the parent handler with URLs
      onFileUpload(omFileUrl, rentRollFileUrl)

    } catch (error) {
      console.error('Upload error:', error)
      setUploadError(error instanceof Error ? error.message : 'Upload failed')
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === 'application/pdf') {
      const sizeError = validateFileSize(file)
      if (sizeError && file.size > MAX_FILE_SIZE) {
        alert(sizeError)
        return
      }
      setSelectedOMFile(file)
      setFileSizeWarning(sizeError)
    }
  }

  const handleRentRollSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const sizeError = validateFileSize(file)
      if (sizeError && file.size > MAX_FILE_SIZE) {
        alert(sizeError)
        return
      }
      setSelectedRentRollFile(file)
      if (sizeError) {
        setFileSizeWarning(sizeError)
      }
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
            <p className="text-sm text-gray-500 mt-1">PDF files only, max 100MB</p>
          </div>
        </div>
      </div>

      {/* File Size Warning */}
      {fileSizeWarning && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-yellow-800 text-sm">{fileSizeWarning}</span>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {(uploadProgress.om > 0 || uploadProgress.rentRoll > 0) && (
        <div className="mt-4 space-y-3">
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="flex justify-between text-sm text-blue-800 mb-1">
              <span>OM Upload</span>
              <span>{uploadProgress.om}%</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress.om}%` }}></div>
            </div>
          </div>
          
          {selectedRentRollFile && (
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="flex justify-between text-sm text-green-800 mb-1">
                <span>Rent Roll Upload</span>
                <span>{uploadProgress.rentRoll}%</span>
              </div>
              <div className="w-full bg-green-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress.rentRoll}%` }}></div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upload Error */}
      {uploadError && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="text-red-800 text-sm">{uploadError}</span>
          </div>
        </div>
      )}

            {/* Rent Roll Upload Section */}
            {/* <div className="text-center mb-6 mt-6">
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
      {/* <div className="mt-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Rent Roll File (Excel/CSV)
        </label>
        <div className="flex items-center space-x-3">
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleRentRollSelect}
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
      </div> */}

      {selectedOMFile && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-green-800 font-medium">
              Selected OM: {selectedOMFile.name} ({(selectedOMFile.size / (1024 * 1024)).toFixed(1)}MB)
            </span>
          </div>
          
          {selectedRentRollFile && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-blue-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-blue-800 font-medium">
                  Rent Roll: {selectedRentRollFile.name} ({(selectedRentRollFile.size / (1024 * 1024)).toFixed(1)}MB)
                </span>
              </div>
              <p className="text-sm text-blue-700 mt-1">
                ✓ Will provide accurate occupancy and rent data
              </p>
            </div>
          )}
          
          <button
            onClick={handleUpload}
            disabled={isLoading || uploadProgress.om > 0}
            className="btn-primary w-full mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Analyzing...' : uploadProgress.om > 0 ? 'Uploading...' : 'Upload & Analyze'}
          </button>
        </div>
      )}

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500">
          Files are securely uploaded to Supabase and then analyzed using AI to extract key property metrics.
        </p>
      </div>
    </div>
  )
}
