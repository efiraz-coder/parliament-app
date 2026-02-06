import { NextRequest, NextResponse } from 'next/server'
import { generateParliamentMemberRole } from '@/lib/member-generator'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'נדרש שם של דמות' },
        { status: 400 }
      )
    }

    const role = await generateParliamentMemberRole(name.trim())

    // אם יש errorMessage, החזר אותו
    if (role.errorMessage) {
      return NextResponse.json({
        error: role.errorMessage,
        hasError: true
      })
    }

    return NextResponse.json({
      role,
      hasError: false
    })
  } catch (error) {
    console.error('Error in generate-member API:', error)
    return NextResponse.json(
      { error: 'שגיאה ביצירת חבר פרלמנט' },
      { status: 500 }
    )
  }
}
