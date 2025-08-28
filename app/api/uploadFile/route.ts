import { NextRequest, NextResponse } from 'next/server'
import { supabase, generateFileName } from '../../lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const fileType = formData.get('fileType') as string // 'om' or 'rentRoll'

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

    // Generate unique filename
    const fileName = generateFileName(file.name)
    const filePath = `${fileType}/${fileName}`

    // Convert File to ArrayBuffer for Supabase
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

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
        { error: 'Failed to upload file to storage' },
        { status: 500 }
      )
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

    return NextResponse.json({
      success: true,
      fileName: file.name,
      filePath,
      publicUrl: urlData.publicUrl,
      fileSize: file.size,
      message: 'File uploaded successfully'
    })

  } catch (error) {
    console.error('File upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}
