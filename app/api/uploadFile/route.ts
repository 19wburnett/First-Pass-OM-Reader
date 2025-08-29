import { NextRequest, NextResponse } from 'next/server'
import { supabase, generateFileName } from '../../lib/supabase'

// Use Edge Runtime for larger payload support
export const runtime = 'edge'

export async function POST(request: NextRequest) {
  console.log('Upload request received:', {
    method: request.method,
    url: request.url,
    timestamp: new Date().toISOString()
  })

  try {
    // Validate environment variables
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      console.error('Missing Supabase environment variables')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    console.log('Environment variables validated successfully')

    const formData = await request.formData()
    const file = formData.get('file') as File
    const fileType = formData.get('fileType') as string // 'om' or 'rentRoll'

    console.log('Form data parsed:', {
      hasFile: !!file,
      fileType,
      fileName: file?.name,
      fileSize: file?.size
    })

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    if (fileType === 'om' && file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'OM file must be a PDF' },
        { status: 400 }
      )
    }

    if (fileType === 'rentRoll' && !['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv'].includes(file.type)) {
      return NextResponse.json(
        { error: 'Rent roll file must be Excel or CSV' },
        { status: 400 }
      )
    }

    console.log('File validation passed')

    // Generate unique filename
    const fileName = generateFileName(file.name)
    const filePath = `${fileType}/${fileName}`

    console.log('Generated file path:', filePath)

    // Convert File to ArrayBuffer for Supabase
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    console.log('File converted to buffer, size:', buffer.length)

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('om-files')
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Supabase upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload file to storage', details: uploadError.message },
        { status: 500 }
      )
    }

    console.log('File uploaded to Supabase successfully')

    // Get public URL for the uploaded file
    const { data: urlData } = supabase.storage
      .from('om-files')
      .getPublicUrl(filePath)

    console.log('Public URL generated:', urlData.publicUrl)

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
    } else {
      console.log('File metadata stored in database')
    }

    const response = {
      success: true,
      fileName: file.name,
      filePath,
      publicUrl: urlData.publicUrl,
      fileSize: file.size,
      message: 'File uploaded successfully'
    }

    console.log('Returning success response:', response)
    return NextResponse.json(response)

  } catch (error) {
    console.error('File upload error:', error)
    
    // Ensure we always return valid JSON
    let errorMessage = 'Failed to upload file'
    let statusCode = 500
    
    if (error instanceof Error) {
      errorMessage = error.message
    }
    
    // Check for specific error types
    if (errorMessage.includes('fetch')) {
      errorMessage = 'Network error - please check your connection'
      statusCode = 503
    } else if (errorMessage.includes('Supabase')) {
      errorMessage = 'Storage service error - please try again later'
      statusCode = 503
    }
    
    const errorResponse = { error: errorMessage }
    console.log('Returning error response:', errorResponse)
    
    return NextResponse.json(
      errorResponse,
      { status: statusCode }
    )
  }
}
