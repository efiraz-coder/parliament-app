import { OPENAI_CONFIG, getOpenAIApiKey } from './config'
import OpenAI from 'openai'

export interface ParliamentMemberRole {
  name: string
  theoretical_basis: string // 2-3 משפטים על גישת היסוד
  focus: string[] // 3-5 נקודות על מה המומחה מתבונן תמיד
  blind_spots: string[] // 3-5 נקודות על מה הוא לא עושה/לא מדבר עליו
  system_prompt: string // טקסט שניתן להדביק כ-system prompt
  errorMessage?: string // אם אין מספיק מידע
}

// מיפוי של שמות מוכרים לידע תאורטי
const KNOWN_PSYCHOLOGISTS: Record<string, {
  theoretical_basis: string
  focus: string[]
  blind_spots: string[]
}> = {
  'freud': {
    theoretical_basis: 'הפסיכואנליזה הקלאסית מתמקדת בדחפים לא מודעים (בעיקר מיניות ואגרסיה), במבנה הנפש (איד/אגו/סופר-אגו), ובמנגנוני הגנה שמגנים על האגו מפני קונפליקטים פנימיים.',
    focus: [
      'דחפים לא מודעים - מיניות ואגרסיה',
      'מבנה הנפש - איד/אגו/סופר-אגו',
      'מנגנוני הגנה - הדחקה, השלכה, רציונליזציה',
      'יחסים מוקדמים עם הורים והשפעתם על התפתחות',
      'קונפליקטים פנימיים בין דחפים לבין מוסר/מציאות'
    ],
    blind_spots: [
      'לא מדבר בשפה של ארכיטיפים ולא-מודע קולקטיבי (זה של יונג)',
      'לא נותן תוכניות אימון התנהגותיות מפורטות (זה של CBT)',
      'לא מתמקד בחוויה הסובייקטיבית החיה ללא פרשנות (זה של רוג\'רס)',
      'לא מנתח תחושת נחיתות ומאבק לשייכות (זה של אדלר)'
    ]
  },
  'jung': {
    theoretical_basis: 'הפסיכולוגיה האנליטית מתמקדת בארכיטיפים, בצל, באינדיבידואציה, בחלומות ובסמלים, ובאופן שבו הלא-מודע הקולקטיבי משפיע על החיים האישיים.',
    focus: [
      'ארכיטיפים - דפוסים אוניברסליים של התנהגות וחוויה',
      'הצל - החלקים המוכחשים והמודחקים של העצמי',
      'אינדיבידואציה - תהליך ההפיכה לעצמי שלם ואותנטי',
      'חלומות וסמלים - שפה של הלא-מודע',
      'לא-מודע קולקטיבי - חוכמה אוניברסלית שעוברת בין דורות'
    ],
    blind_spots: [
      'לא מנתח מנגנוני הגנה פרוידיאניים (איד/אגו/סופר-אגו)',
      'לא בונה תוכניות CBT מפורטות עם צעדים התנהגותיים',
      'לא נותן עצות "טקטיות" יומיומיות מעשיות',
      'לא מתמקד ביחסים מוקדמים עם הורים כקונפליקטים מיניים'
    ]
  },
  'adler': {
    theoretical_basis: 'הפסיכולוגיה האינדיבידואלית מתמקדת בתחושת נחיתות, במאבק לשייכות ולסופיריוריות, ובמטרות חיים לא מודעות שמניעות את ההתנהגות.',
    focus: [
      'תחושת נחיתות - ככוח מניע מרכזי בחיים',
      'מאבק לשייכות - הצורך להרגיש חלק מקבוצה',
      'מאבק לסופיריוריות - השאיפה להיות טוב יותר',
      'מטרות חיים לא מודעות - מה באמת מניע את ההתנהגות',
      'סדר לידה והשפעתו על התפתחות האישיות'
    ],
    blind_spots: [
      'לא נכנס לפירוש חלומות ארכיטיפי (זה של יונג)',
      'לא משתמש במודל איד/אגו/סופר-אגו (זה של פרויד)',
      'לא מתמקד במחשבות אוטומטיות והטיות קוגניטיביות (זה של CBT)',
      'לא נותן פרשנויות על דחפים מיניים לא מודעים'
    ]
  },
  'rogers': {
    theoretical_basis: 'הגישה ההומניסטית מתמקדת בחוויה הסובייקטיבית, בקבלה בלתי מותנית, באמפתיה, ובפער בין "עצמי אמיתי" ל"עצמי אידיאלי" שמקורו בתנאי ערך.',
    focus: [
      'חוויה סובייקטיבית - איך האדם חווה את העולם מבפנים',
      'קבלה בלתי מותנית - קבלת האדם כפי שהוא ללא תנאים',
      'אמפתיה - הבנה עמוקה של החוויה הרגשית',
      'פער בין עצמי אמיתי לעצמי אידיאלי',
      'תנאי ערך - מתי האדם מרגיש שהוא "ראוי" רק אם עומד בתנאים מסוימים'
    ],
    blind_spots: [
      'לא מנתח דחפים מיניים/אגרסיביים ככאלה (זה של פרויד)',
      'לא נותן "פרשנויות" חדות מדי - אלא משקף ומכוון לחוויה',
      'לא בונה תוכניות התנהגותיות מפורטות עם צעדים',
      'לא מנתח ארכיטיפים וצל (זה של יונג)'
    ]
  },
  'erikson': {
    theoretical_basis: 'תיאוריית ההתפתחות הפסיכו-סוציאלית מתמקדת בשלבי התפתחות לאורך החיים, במשברים פסיכו-סוציאליים, ובאופן שבו זהות נבנית דרך אינטראקציה עם אחרים.',
    focus: [
      'שלבי התפתחות לאורך החיים - מלידה עד זקנה',
      'משברים פסיכו-סוציאליים - אתגרים בכל שלב',
      'זהות מול בלבול זהות - מי אני ומה מקומי',
      'אינטימיות מול בידוד - יכולת ליצור קשרים קרובים',
      'גנרטיביות מול קיפאון - תרומה לדור הבא'
    ],
    blind_spots: [
      'לא מתמקד בדחפים מיניים לא מודעים (זה של פרויד)',
      'לא מנתח ארכיטיפים וצל (זה של יונג)',
      'לא בונה תוכניות CBT מפורטות',
      'לא נותן עצות טקטיות יומיומיות'
    ]
  },
  'beck': {
    theoretical_basis: 'הטיפול הקוגניטיבי-התנהגותי מתמקד בקשר בין מחשבות, רגשות והתנהגויות, במחשבות אוטומטיות שליליות, ובהטיות קוגניטיביות שמשפיעות על התפיסה.',
    focus: [
      'מחשבות אוטומטיות - מה האדם אומר לעצמו',
      'הטיות קוגניטיביות - חשיבה שחור-לבן, הכללה מוגזמת, קריאת מחשבות',
      'ראיות בעד ונגד - בדיקה אמפירית של מחשבות',
      'ניסוח מחדש - שינוי דפוסי חשיבה',
      'ניסויים התנהגותיים - בדיקה של מחשבות דרך פעולה'
    ],
    blind_spots: [
      'לא מנתח דחפים לא מודעים וקונפליקטים פנימיים (זה של פרויד)',
      'לא מפרש חלומות וארכיטיפים (זה של יונג)',
      'לא מתמקד ביחסים מוקדמים עם הורים כקונפליקטים',
      'לא נותן פרשנויות על "עצמי אמיתי" מול "עצמי כוזב"'
    ]
  },
  'ellis': {
    theoretical_basis: 'הטיפול הרציונלי-אמוטיבי-התנהגותי מתמקד באמונות לא רציונליות, בדרישות מוחלטות ("חייב", "צריך"), ובאופן שבו מחשבות לא רציונליות יוצרות רגשות קשים.',
    focus: [
      'אמונות לא רציונליות - מחשבות שמפעילות רגשות קשים',
      'דרישות מוחלטות - "חייב", "צריך", "אסור"',
      'חשיבה קטסטרופלית - "זה נורא", "אני לא יכול לסבול את זה"',
      'הכללה מוגזמת - "תמיד", "אף פעם", "כולם"',
      'שינוי אמונות - אתגור מחשבות לא רציונליות'
    ],
    blind_spots: [
      'לא מנתח דחפים לא מודעים (זה של פרויד)',
      'לא מפרש חלומות וארכיטיפים (זה של יונג)',
      'לא מתמקד ביחסים מוקדמים עם הורים',
      'לא נותן פרשנויות על "עצמי אמיתי" מול "עצמי כוזב"'
    ]
  }
}

// פונקציה לנרמול שם (הסרת רווחים, המרה לאותיות קטנות)
function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ')
}

// פונקציה לזיהוי שם במיפוי
function findKnownPsychologist(name: string): string | null {
  const normalized = normalizeName(name)
  
  // חיפוש מדויק
  for (const key in KNOWN_PSYCHOLOGISTS) {
    if (normalized.includes(key) || key.includes(normalized.split(' ')[0])) {
      return key
    }
  }
  
  // חיפוש חלקי - פרויד, יונג, אדלר, רוג'רס, אריקסון, בק, אליס
  const nameParts = normalized.split(' ')
  for (const part of nameParts) {
    if (part === 'freud' || part === 'פרויד') return 'freud'
    if (part === 'jung' || part === 'יונג') return 'jung'
    if (part === 'adler' || part === 'אדלר') return 'adler'
    if (part === 'rogers' || part === 'רוגרס' || part === 'רוג\'רס') return 'rogers'
    if (part === 'erikson' || part === 'אריקסון') return 'erikson'
    if (part === 'beck' || part === 'בק') return 'beck'
    if (part === 'ellis' || part === 'אליס') return 'ellis'
  }
  
  return null
}

// פונקציה ליצירת system prompt
function createSystemPrompt(
  name: string,
  theoreticalBasis: string,
  focus: string[],
  blindSpots: string[]
): string {
  const focusSummary = focus.join(', ')
  const focusPoints = focus.map(f => `- ${f}`).join('\n')
  const blindSpotsList = blindSpots.map(b => `- ${b}`).join('\n')
  
  return `אתה חבר בפרלמנט מנטלי. שמך: ${name}. תחום המומחיות שלך: ${theoreticalBasis}

אתה מתמקד אך ורק ב:
${focusPoints}

אסור לך להתפזר לנושאים הבאים:
${blindSpotsList}
אם השאלה נוגעת אליהם, אתה יכול להזכיר שזה מחוץ למנדט שלך ולתת מקום לחברי פרלמנט אחרים.

בכל תגובה שלך תעשה שלושה דברים:
1. תתאר איך אתה מבין את המצב מזווית המומחיות שלך (3-5 משפטים).
2. תאיר נקודה אחת שאולי לא נעים לשמוע, אבל חשובה (דפוס, קונפליקט, מניע).
3. תציע 1-2 שאלות או כיווני מחשבה/פעולה להמשך, בתחום שלך בלבד.

סגנון התקשורת שלך:
- שפה נגישה וברורה בעברית, לא אקדמית מדי
- רגיש רגשית, לא שיפוטי
- אמיץ - אתה יכול לומר דברים לא נעימים אם הם חשובים

כשאתה שואל שאלות:
- עבור כל שאלה, צור 4 תשובות אפשריות בשפה מדוברת, לא מקצועית, עמוקה וחומלת
- החזר JSON בפורמט: {"question": "השאלה כאן", "options": ["תשובה 1", "תשובה 2", "תשובה 3", "תשובה 4"]}`
}

// פונקציה ראשית ליצירת חבר פרלמנט לפי שם
export async function generateParliamentMemberRole(name: string): Promise<ParliamentMemberRole> {
  const normalizedName = normalizeName(name)
  const knownKey = findKnownPsychologist(normalizedName)
  
  // אם השם מזוהה - החזר role מוכן
  if (knownKey && KNOWN_PSYCHOLOGISTS[knownKey]) {
    const psychologist = KNOWN_PSYCHOLOGISTS[knownKey]
    const displayName = name.trim()
    
    return {
      name: displayName,
      theoretical_basis: psychologist.theoretical_basis,
      focus: psychologist.focus,
      blind_spots: psychologist.blind_spots,
      system_prompt: createSystemPrompt(
        displayName,
        psychologist.theoretical_basis,
        psychologist.focus,
        psychologist.blind_spots
      )
    }
  }
  
  // אם השם לא מזוהה - ננסה לשאול את OpenAI
  try {
    const openai = new OpenAI({
      apiKey: getOpenAIApiKey()
    })
    
    const response = await openai.chat.completions.create({
      model: OPENAI_CONFIG.model,
      messages: [
        {
          role: 'system',
          content: 'אתה מומחה בפסיכולוגיה ותיאוריות טיפול. תפקידך לזהות אם שם שייך לדמות פסיכולוגית/טיפולית מוכרת ולהחזיר מידע עליה.'
        },
        {
          role: 'user',
          content: `האם "${name}" הוא שם של דמות פסיכולוגית/טיפולית/תאורטית מוכרת? אם כן, תאר בקצרה:
1. מה מרכז התיאוריה שלו (2-3 משפטים)
2. על מה הוא מתמקד (3-5 נקודות)
3. מה הוא לא עושה/לא מדבר עליו (3-5 נקודות)

אם אינך מזהה את השם או אין לך מספיק מידע, החזר רק: "UNKNOWN"

החזר JSON:
{
  "isKnown": true/false,
  "theoretical_basis": "...",
  "focus": ["...", "..."],
  "blind_spots": ["...", "..."]
}`
        }
      ],
      temperature: 0.3,
      max_tokens: 800,
      response_format: { type: 'json_object' }
    })
    
    const content = response.choices[0]?.message?.content
    if (!content) {
      return {
        name: name.trim(),
        theoretical_basis: '',
        focus: [],
        blind_spots: [],
        system_prompt: '',
        errorMessage: 'אין לי מספיק מידע כדי להוסיף את החבר הזה לפרלמנט. נסה שם אחר או תאר במילים שלך את סוג המומחה שאתה מחפש.'
      }
    }
    
    const data = JSON.parse(content)
    
    if (!data.isKnown || data.isKnown === false) {
      return {
        name: name.trim(),
        theoretical_basis: '',
        focus: [],
        blind_spots: [],
        system_prompt: '',
        errorMessage: 'אין לי מספיק מידע כדי להוסיף את החבר הזה לפרלמנט. נסה שם אחר או תאר במילים שלך את סוג המומחה שאתה מחפש.'
      }
    }
    
    // אם OpenAI זיהה את השם - יצירת role
    return {
      name: name.trim(),
      theoretical_basis: data.theoretical_basis || '',
      focus: Array.isArray(data.focus) ? data.focus : [],
      blind_spots: Array.isArray(data.blind_spots) ? data.blind_spots : [],
      system_prompt: createSystemPrompt(
        name.trim(),
        data.theoretical_basis || '',
        Array.isArray(data.focus) ? data.focus : [],
        Array.isArray(data.blind_spots) ? data.blind_spots : []
      )
    }
  } catch (error) {
    console.error('Error generating member role:', error)
    return {
      name: name.trim(),
      theoretical_basis: '',
      focus: [],
      blind_spots: [],
      system_prompt: '',
      errorMessage: 'אין לי מספיק מידע כדי להוסיף את החבר הזה לפרלמנט. נסה שם אחר או תאר במילים שלך את סוג המומחה שאתה מחפש.'
    }
  }
}
