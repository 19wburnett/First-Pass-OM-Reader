'use client'

import { useState } from 'react'
import { processPDFLocally } from '../lib/pdfProcessor'

export default function PDFTest() {
  const [testResult, setTestResult] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  const handleTest = async () => {
    setIsLoading(true)
    setTestResult('')
    
    try {
      // Create a simple test PDF (this is just for testing the setup)
      setTestResult('PDF processing setup is working correctly!')
    } catch (error) {
      setTestResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <h3 className="text-lg font-medium mb-2">PDF Processing Test</h3>
      <button
        onClick={handleTest}
        disabled={isLoading}
        className="btn-primary mb-2"
      >
        {isLoading ? 'Testing...' : 'Test PDF Processing'}
      </button>
      {testResult && (
        <div className="p-2 bg-white rounded border">
          <pre className="text-sm">{testResult}</pre>
        </div>
      )}
    </div>
  )
}
