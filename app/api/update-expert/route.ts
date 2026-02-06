import { NextRequest, NextResponse } from 'next/server'
import { getAgentById, updateAgent } from '@/lib/agents'
import { generateParliamentMemberRole } from '@/lib/member-generator'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { agentId, researcherName } = body

    if (!agentId || !researcherName || typeof agentId !== 'string' || typeof researcherName !== 'string') {
      return NextResponse.json(
        { error: 'נדרשים agentId ו-researcherName' },
        { status: 400 }
      )
    }

    const agent = getAgentById(agentId)
    if (!agent) {
      return NextResponse.json(
        { error: 'מומחה לא נמצא' },
        { status: 404 }
      )
    }

    // קריאה למחולל חבר פרלמנט לפי שם
    const memberRole = await generateParliamentMemberRole(researcherName)

    // אם יש שגיאה (שם לא מזוהה), החזר שגיאה
    if (memberRole.errorMessage) {
      return NextResponse.json(
        { error: memberRole.errorMessage },
        { status: 400 }
      )
    }

    // עדכון המומחה עם המידע החדש
    const success = updateAgent(agentId, {
      inspiredBy: researcherName,
      name: memberRole.name,
      systemPrompt: memberRole.system_prompt,
      description: memberRole.theoretical_basis,
      questionStyle: `שואל שאלות מזווית ${memberRole.name}, מתמקד ב: ${memberRole.focus.join(', ')}`,
      analysisStyle: `מנתח את השאלה דרך עדשת ${memberRole.name}, לא מתפזר ל: ${memberRole.blind_spots.join(', ')}`
    })

    if (!success) {
      return NextResponse.json(
        { error: 'שגיאה בעדכון המומחה' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      agent: getAgentById(agentId)
    })
  } catch (error) {
    console.error('Error updating expert:', error)
    return NextResponse.json(
      { error: 'שגיאה בעדכון המומחה' },
      { status: 500 }
    )
  }
}
