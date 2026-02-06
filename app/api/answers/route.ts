import { NextRequest, NextResponse } from 'next/server'
import { AnswersRequest, AnswersResponse } from '@/lib/types'
import { getAgentById } from '@/lib/agents'

export async function POST(request: NextRequest) {
  try {
    const body: AnswersRequest = await request.json()
    const { originalQuestion, answers } = body

    if (!originalQuestion || !answers || !Array.isArray(answers) || answers.length === 0) {
      return NextResponse.json(
        { error: 'נדרשים שאלה מקורית ותשובות' },
        { status: 400 }
      )
    }

    // יצירת ניתוח עבור כל מומחה
    const agentAnalyses = await Promise.all(
      answers.map(async (answer) => {
        const agent = getAgentById(answer.agentId)
        if (!agent) {
          return {
            agentId: answer.agentId,
            analysis: 'מומחה לא נמצא'
          }
        }

        // יצירת ניתוח על בסיס התשובות
        const analysis = await generateAnalysis(
          agent,
          originalQuestion,
          answer.question,
          answer.selectedOptions.map(idx => answer.options[idx]),
          answer.freeText
        )

        return {
          agentId: answer.agentId,
          analysis
        }
      })
    )

    // יצירת סיכום של יו"ר הפרלמנט
    const summary = await generateSummary(originalQuestion, agentAnalyses)

    return NextResponse.json({
      originalQuestion,
      agentAnalyses,
      summary
    } as AnswersResponse)
  } catch (error) {
    console.error('Error processing answers:', error)
    return NextResponse.json(
      { error: 'שגיאה בעיבוד התשובות' },
      { status: 500 }
    )
  }
}

async function generateAnalysis(
  agent: any,
  originalQuestion: string,
  question: string,
  selectedOptions: string[],
  freeText: string
): Promise<string> {
  // זהו placeholder - בהמשך נוכל להחליף עם קריאה אמיתית ל-LLM
  // TODO: כאן תהיה קריאה ל-LLM עם ה-prompt של המומחה
  
  const optionsText = selectedOptions.length > 0 
    ? `המשתמש בחר: ${selectedOptions.join(', ')}`
    : 'המשתמש לא בחר באפשרויות'
  
  const freeTextPart = freeText.trim() 
    ? `\n\nתשובה חופשית: ${freeText}`
    : ''
  
  return `כמומחה ${agent.role} בהשראת ${agent.inspiredBy}, אני רואה שהשאלה המקורית "${originalQuestion}" מעלה נקודות מעניינות.

השאלה הספציפית שלי הייתה: "${question}". ${optionsText}.${freeTextPart}

תבסס על הגישה של ${agent.inspiredBy}, אני מציע התבוננות על המשמעות העמוקה יותר של השאלה, תוך התמקדות ב-${agent.description}.`
}

async function generateSummary(
  originalQuestion: string,
  agentAnalyses: Array<{ agentId: string; analysis: string }>
): Promise<string> {
  // זהו placeholder - בהמשך נוכל להחליף עם קריאה אמיתית ל-LLM
  // TODO: כאן תהיה קריאה ל-LLM ליצירת סיכום של יו"ר הפרלמנט
  
  return `סיכום יו"ר הפרלמנט:

השאלה "${originalQuestion}" עוררה דיון מעמיק בקרב ${agentAnalyses.length} מומחים. כל מומחה הביא פרספקטיבה ייחודית משלו, והתשובות של המשתמש סיפקו תובנות חשובות.

הדיון חשף היבטים שונים של השאלה, מהרגשי והאישי ועד לניהולי והאסטרטגי. נראה שיש כאן הזדמנות להתבוננות מעמיקה ולמידה.

אני ממליץ למשתמש להמשיך לחקור את הנושא, תוך שימת לב לנושאים שעלו בדיון.`
}
