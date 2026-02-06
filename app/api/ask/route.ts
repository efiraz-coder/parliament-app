import { NextRequest, NextResponse } from 'next/server'
import { agents, Agent } from '@/lib/agents'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { question } = body

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return NextResponse.json(
        { error: 'שאלה חובה' },
        { status: 400 }
      )
    }

    // בחירת 4 סוכנים רלוונטיים לפי תוכן השאלה
    const selectedAgents = selectRelevantAgents(question.trim(), 4)
    
    // יצירת שאלה אחת מכל סוכן עם אפשרויות תשובה
    const questions = selectedAgents.map(agent => {
      const questionText = generateSingleQuestionForAgent(agent, question.trim())
      const options = generateAnswerOptions(agent, questionText, question.trim())
      return {
        question: questionText,
        agentId: agent.id,
        options
      }
    })

    return NextResponse.json({
      originalQuestion: question,
      questions
    })
  } catch (error) {
    console.error('Error processing question:', error)
    return NextResponse.json(
      { error: 'שגיאה בעיבוד השאלה' },
      { status: 500 }
    )
  }
}

function selectRelevantAgents(question: string, count: number): Agent[] {
  const questionLower = question.toLowerCase()
  
  // מילות מפתח לכל קטגוריה
  const emotionalKeywords = ['רגש', 'מרגיש', 'חש', 'כעס', 'פחד', 'חרדה', 'דיכאון', 'שמחה', 'עצב', 'כאב', 'מתח', 'לחץ']
  const culturalKeywords = ['תרבות', 'חברה', 'נורמה', 'מסורת', 'זהות', 'שייכות', 'קהילה', 'משפחה', 'חברתי']
  const managementKeywords = ['החלטה', 'יעד', 'מטרה', 'תוכנית', 'פרויקט', 'משאב', 'סיכון', 'הזדמנות', 'אסטרטגיה', 'ניהול']
  const philosophicalKeywords = ['משמעות', 'ערך', 'מוסר', 'דילמה', 'עקרון', 'אמת', 'צדק', 'טוב', 'רע']
  const dataKeywords = ['נתון', 'עובדה', 'מידע', 'סטטיסטיקה', 'תרחיש', 'אפשרות', 'אופציה', 'משתנה']
  
  // חישוב ציון התאמה לכל סוכן
  const agentScores = agents.map(agent => {
    let score = 0
    const agentId = agent.id
    
    // פסיכולוג/CBT - שאלות רגשיות
    if (agentId === 'psychologist' || agentId === 'cbt-therapist') {
      score += emotionalKeywords.filter(kw => questionLower.includes(kw)).length * 3
      score += questionLower.includes('?') ? 1 : 0 // שאלות רגשיות לרוב עם סימן שאלה
    }
    
    // חוקר תרבות/אנתרופולוג - שאלות תרבותיות
    if (agentId === 'cultural-researcher' || agentId === 'anthropologist') {
      score += culturalKeywords.filter(kw => questionLower.includes(kw)).length * 3
    }
    
    // מנהל/מדען נתונים - שאלות ניהוליות
    if (agentId === 'manager' || agentId === 'data-scientist') {
      score += managementKeywords.filter(kw => questionLower.includes(kw)).length * 3
      score += dataKeywords.filter(kw => questionLower.includes(kw)).length * 2
    }
    
    // פילוסוף - שאלות ערכיות
    if (agentId === 'philosopher') {
      score += philosophicalKeywords.filter(kw => questionLower.includes(kw)).length * 3
    }
    
    // אני-העתידי - תמיד רלוונטי אבל עם ציון נמוך יותר
    if (agentId === 'future-self') {
      score += 1 // תמיד קצת רלוונטי
    }
    
    return { agent, score }
  })
  
  // מיון לפי ציון (גבוה לנמוך) ובחירת 4 הראשונים
  agentScores.sort((a, b) => b.score - a.score)
  
  // אם יש כמה עם אותו ציון, מערבבים אותם
  const topScore = agentScores[0]?.score || 0
  const topAgents = agentScores.filter(a => a.score === topScore)
  if (topAgents.length > count) {
    // מערבבים את אלה עם הציון הגבוה ביותר
    for (let i = topAgents.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [topAgents[i], topAgents[j]] = [topAgents[j], topAgents[i]]
    }
  }
  
  // לוקחים 4 סוכנים שונים
  const selected: Agent[] = []
  const selectedIds = new Set<string>()
  
  for (const { agent } of agentScores) {
    if (selected.length >= count) break
    if (!selectedIds.has(agent.id)) {
      selected.push(agent)
      selectedIds.add(agent.id)
    }
  }
  
  // אם לא מספיק, מוסיפים באופן אקראי
  while (selected.length < count && selected.length < agents.length) {
    const randomAgent = agents[Math.floor(Math.random() * agents.length)]
    if (!selectedIds.has(randomAgent.id)) {
      selected.push(randomAgent)
      selectedIds.add(randomAgent.id)
    }
  }
  
  return selected
}

function generateSingleQuestionForAgent(agent: Agent, originalQuestion: string): string {
  // כל סוכן יוצר שאלה אחת בהתאם לסגנון שלו
  // זהו placeholder - בהמשך נוכל להחליף את זה עם קריאה ל-LLM אמיתי
  
  const questions: string[] = []
  
  // שאלות מותאמות לכל סוכן בהתאם לסגנון שלו
  switch (agent.id) {
    case 'philosopher':
      questions.push(
        'מה המשמעות העמוקה של השאלה הזו עבורך?',
        'אילו ערכים בסיסיים עומדים מאחורי השאלה?',
        'איזו דילמה מוסרית אתה מזהה כאן?'
      )
      break
      
    case 'psychologist':
      questions.push(
        'איך אתה מרגיש כשאתה חושב על השאלה הזו?',
        'אילו מחשבות אוטומטיות עולות לך?',
        'איזו אמונה ליבה שלך משפיעה על השאלה?'
      )
      break
      
    case 'cultural-researcher':
      questions.push(
        'איך הסביבה התרבותית שלך משפיעה על השאלה?',
        'אילו ציפיות חברתיות אתה מזהה כאן?',
        'איך השאלה קשורה לזהות שלך?'
      )
      break
      
    case 'manager':
      questions.push(
        'מה היעד שלך ביחס לשאלה?',
        'אילו משאבים זמינים לך?',
        'מה הסיכונים וההזדמנויות שאתה רואה?'
      )
      break
      
    case 'cbt-therapist':
      questions.push(
        'מה אתה אומר לעצמך על השאלה?',
        'מה הראיות בעד ונגד המחשבה שלך?',
        'איך אפשר לנסח את זה מחדש?'
      )
      break
      
    case 'anthropologist':
      questions.push(
        'איזה סיפור אישי קשור לשאלה?',
        'איך השאלה קשורה להקשר החברתי שלך?',
        'אילו דפוסי התנהגות חוזרים אתה מזהה?'
      )
      break
      
    case 'data-scientist':
      questions.push(
        'אילו נתונים ועובדות רלוונטיים לשאלה?',
        'מה המשתנים המרכזיים שאתה מזהה?',
        'אילו תרחישים אפשריים אתה רואה?'
      )
      break
      
    case 'future-self':
      questions.push(
        'איך תראה על השאלה הזו בעוד שנה?',
        'מה באמת חשוב לך בטווח הארוך?',
        'מה תרצה לזכור על הרגע הזה?'
      )
      break
      
    default:
      questions.push('מה חשוב לך לדעת?', 'איך זה משפיע עליך?')
  }
  
  // מחזיר שאלה אחת אקראית מהרשימה
  return questions[Math.floor(Math.random() * questions.length)]
}

function generateAnswerOptions(agent: Agent, questionText: string, originalQuestion: string): string[] {
  // כל סוכן יוצר 4 אפשרויות תשובה בהתאם לסגנון שלו
  const options: string[] = []
  
  switch (agent.id) {
    case 'philosopher':
      options.push(
        'יש כאן דילמה מוסרית עמוקה שדורשת התבוננות',
        'הערכים הבסיסיים שלי עומדים במרכז השאלה',
        'אני צריך לחשוב על המשמעות הרחבה יותר',
        'יש כאן שאלה של צדק ומוסר'
      )
      break
      
    case 'psychologist':
      options.push(
        'אני מרגיש שזה נוגע ברגשות עמוקים',
        'יש כאן מחשבות אוטומטיות שמשפיעות עלי',
        'אני מזהה דפוס חשיבה שחוזר על עצמו',
        'יש כאן אמונה ליבה שמשפיעה על התפיסה שלי'
      )
      break
      
    case 'cultural-researcher':
      options.push(
        'הסביבה התרבותית שלי משפיעה על השאלה',
        'יש כאן ציפיות חברתיות שאני מרגיש',
        'זה קשור לזהות שלי ולמקום שלי בחברה',
        'יש כאן נורמות שמשפיעות על החשיבה שלי'
      )
      break
      
    case 'manager':
      options.push(
        'אני צריך להגדיר יעד ברור',
        'יש לי משאבים שאני יכול להשתמש בהם',
        'אני מזהה סיכונים והזדמנויות',
        'אני צריך תוכנית פעולה מעשית'
      )
      break
      
    case 'cbt-therapist':
      options.push(
        'יש כאן מחשבה אוטומטית שאני אומר לעצמי',
        'אני צריך לבדוק את הראיות בעד ונגד',
        'אפשר לנסח את זה מחדש בצורה אחרת',
        'יש כאן דפוס חשיבה שאפשר לשנות'
      )
      break
      
    case 'anthropologist':
      options.push(
        'יש כאן סיפור אישי שמשפיע עלי',
        'זה קשור להקשר החברתי שלי',
        'אני מזהה דפוס התנהגות חוזר',
        'יש כאן טקס או מנהג שמשפיע עלי'
      )
      break
      
    case 'data-scientist':
      options.push(
        'אני צריך לבדוק את הנתונים והעובדות',
        'יש כאן משתנים מרכזיים שאני מזהה',
        'אני יכול לראות כמה תרחישים אפשריים',
        'אני צריך לארגן את המידע בצורה מסודרת'
      )
      break
      
    case 'future-self':
      options.push(
        'בעוד שנה זה יראה אחרת',
        'מה באמת חשוב בטווח הארוך',
        'אני רוצה לזכור את הפרספקטיבה הזו',
        'יש כאן למידה חשובה לעתיד'
      )
      break
      
    default:
      options.push(
        'זה חשוב לי לדעת',
        'זה משפיע עלי',
        'אני צריך לחשוב על זה',
        'יש כאן משהו שדורש התבוננות'
      )
  }
  
  // מחזיר 4 אפשרויות
  return options.slice(0, 4)
}
