import { NextRequest, NextResponse } from 'next/server'
import { setExternalDomainUserApproval, getExternalDomainState, addMessage, ChatMessage } from '@/lib/chat-state'
import { getExternalSpecialist } from '@/lib/external-specialists'

export interface ExternalDomainApprovalRequest {
  sessionId: string
  approved: boolean
}

export async function POST(request: NextRequest) {
  try {
    const body: ExternalDomainApprovalRequest = await request.json()
    const { sessionId, approved } = body

    if (!sessionId || approved === undefined) {
      return NextResponse.json(
        { error: 'נתונים חסרים' },
        { status: 400 }
      )
    }

    const externalDomainState = getExternalDomainState(sessionId)
    
    if (!externalDomainState?.detected || !externalDomainState.domain) {
      return NextResponse.json(
        { error: 'לא נמצא תחום חיצוני לאישור' },
        { status: 400 }
      )
    }

    // Set user approval
    setExternalDomainUserApproval(sessionId, approved)

    if (approved) {
      // Get the specialist info
      const specialist = getExternalSpecialist(externalDomainState.domain)
      
      // Log the addition to conversation history
      const systemMessage: ChatMessage = {
        speaker: 'system',
        role: 'system',
        content: `[מומחה-חוץ נוסף: ${specialist.displayName}] המשתמש אישר הוספת מומחה-חוץ לתחום ${externalDomainState.domainDisplayName}`,
        timestamp: new Date().toISOString()
      }
      addMessage(sessionId, systemMessage)

      console.log(`[External Domain] User approved adding ${specialist.displayName} to session ${sessionId}`)

      return NextResponse.json({
        success: true,
        approved: true,
        specialistAdded: true,
        specialistName: specialist.displayName,
        message: `${specialist.displayName} נוסף לשיחה. הוא ייתן זווית כללית בתחום ${externalDomainState.domainDisplayName} מבלי לאבחן או להמליץ על צעדים קונקרטיים.`
      })
    } else {
      console.log(`[External Domain] User declined adding external specialist to session ${sessionId}`)

      return NextResponse.json({
        success: true,
        approved: false,
        specialistAdded: false,
        message: 'הבנתי, נמשיך בשיחה רגילה ללא מומחה-חוץ.'
      })
    }
  } catch (error) {
    console.error('Error in external domain approval API:', error)
    return NextResponse.json(
      { error: 'שגיאה בעיבוד הבקשה' },
      { status: 500 }
    )
  }
}
