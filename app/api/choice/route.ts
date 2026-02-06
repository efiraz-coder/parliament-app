import { NextRequest, NextResponse } from 'next/server'
import { setContinueRefining, getRoundNumber } from '@/lib/chat-state'
import { ChoiceRequest } from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
    const body: ChoiceRequest = await request.json()
    const { sessionId, choice } = body

    if (!sessionId || !choice) {
      return NextResponse.json(
        { error: 'נתונים חסרים' },
        { status: 400 }
      )
    }

    if (choice === 'continue') {
      // המשתמש בחר להמשיך לדייק
      setContinueRefining(sessionId, true)
      return NextResponse.json({
        success: true,
        continueRefining: true
      })
    } else if (choice === 'opinion') {
      // המשתמש בחר בחוות דעת - נחזיר success והתשובה תיווצר ב-frontend
      return NextResponse.json({
        success: true,
        continueRefining: false
      })
    } else {
      return NextResponse.json(
        { error: 'בחירה לא תקינה' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error in choice API:', error)
    return NextResponse.json(
      { error: 'שגיאה בעיבוד הבחירה' },
      { status: 500 }
    )
  }
}
