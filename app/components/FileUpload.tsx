'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { UserAssumptions } from '../types'
import { supabase, generateFileName } from '../lib/supabase'

interface FileUploadProps {
  onFileUpload: (omFileUrl: string, rentRollFileUrl?: string, userAssumptions?: UserAssumptions) => void
  isLoading: boolean
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB in bytes (Vercel limit)
const WARNING_FILE_SIZE = 5 * 1024 * 1024 // 5MB warning threshold

export default function FileUpload({ onFileUpload, isLoading }: FileUploadProps) {
  const [selectedOMFile, setSelectedOMFile] = useState<File | null>(null)
  const [selectedRentRollFile, setSelectedRentRollFile] = useState<File | null>(null)
  const [fileSizeWarning, setFileSizeWarning] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<{ om: number; rentRoll: number }>({ om: 0, rentRoll: 0 })
  const [uploadError, setUploadError] = useState<string | null>(null)
  
  // User assumptions state
  const [userAssumptions, setUserAssumptions] = useState<UserAssumptions>({
    targetIRR: 0.15, // 15%
    defaultCapRate: 0.06, // 6%
    exitCapRate: 0.065, // 6.5%
    loanToValue: 0.65, // 65%
    interestRate: 0.06, // 6%
    analysisTerm: 5 // 5 years
  })

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
    try {
      // Upload directly to Supabase Storage
      const fileName = generateFileName(file.name)
      const filePath = `${fileType}/${fileName}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('om-files')
        .upload(filePath, file, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        throw new Error(uploadError.message)
      }

      // Get public URL for the uploaded file
      const { data: urlData } = supabase.storage
        .from('om-files')
        .getPublicUrl(filePath)

      // Store file metadata in database
      const { error: dbError } = await supabase
        .from('file_uploads')
        .insert({
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          file_type: file.type,
          file_type_category: fileType,
          public_url: urlData.publicUrl,
          uploaded_at: new Date().toISOString()
        })

      if (dbError) {
        console.error('Database insert error:', dbError)
        // Don't fail the upload if database insert fails
      }

      return urlData.publicUrl
    } catch (error) {
      console.error('Supabase upload error:', error)
      throw new Error('Failed to upload file to storage')
    }
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

      // Call the parent handler with URLs and user assumptions
      onFileUpload(omFileUrl, rentRollFileUrl, userAssumptions)

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

      {/* User Assumptions Section */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Investment Assumptions</h4>
        
        {/* Assumptions Summary */}
        <div className="mb-4 p-3 bg-white border border-gray-200 rounded-md">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <div className="text-center">
              <div className="font-medium text-gray-900">
                {userAssumptions.targetIRR * 100}%
              </div>
              <div className="text-xs text-gray-500">Target IRR</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-gray-900">
                {userAssumptions.defaultCapRate * 100}%
              </div>
              <div className="text-xs text-gray-500">Cap Rate</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-gray-900">
                {userAssumptions.loanToValue * 100}%
              </div>
              <div className="text-xs text-gray-500">LTV</div>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            These settings will be used for underwriting calculations
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Target IRR (%)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={userAssumptions.targetIRR * 100}
              onChange={(e) => setUserAssumptions(prev => ({
                ...prev,
                targetIRR: parseFloat(e.target.value) / 100
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="15.0"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Default Cap Rate (%)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="20"
              value={userAssumptions.defaultCapRate * 100}
              onChange={(e) => setUserAssumptions(prev => ({
                ...prev,
                defaultCapRate: parseFloat(e.target.value) / 100
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="6.0"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Exit Cap Rate (%)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="20"
              value={userAssumptions.exitCapRate * 100}
              onChange={(e) => setUserAssumptions(prev => ({
                ...prev,
                exitCapRate: parseFloat(e.target.value) / 100
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="6.5"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Loan-to-Value (%)
            </label>
            <input
              type="number"
              step="1"
              min="0"
              max="100"
              value={userAssumptions.loanToValue * 100}
              onChange={(e) => setUserAssumptions(prev => ({
                ...prev,
                loanToValue: parseFloat(e.target.value) / 100
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="65"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Interest Rate (%)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="20"
              value={userAssumptions.interestRate * 100}
              onChange={(e) => setUserAssumptions(prev => ({
                ...prev,
                interestRate: parseFloat(e.target.value) / 100
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="6.0"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Analysis Term (Years)
            </label>
            <input
              type="number"
              step="1"
              min="1"
              max="20"
              value={userAssumptions.analysisTerm}
              onChange={(e) => setUserAssumptions(prev => ({
                ...prev,
                analysisTerm: parseInt(e.target.value)
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="5"
            />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          These assumptions will be used for underwriting calculations and IRR analysis.
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
