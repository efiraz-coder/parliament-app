/**
 * External Domain Detection
 * Detects when users mention domains outside the parliament's core expertise
 */

export type ExternalDomainType = 
  | 'neurological-attention'   // ADHD, קשב, תרופות לקשב
  | 'psychiatric'              // פסיכיאטר, תרופות פסיכיאטריות
  | 'medical'                  // מחלות כרוניות, אבחונים רפואיים
  | 'legal'                    // משפטי, עו"ד, תביעות
  | 'financial'                // פיננסי, חובות, פשיטת רגל
  | 'employment-legal'         // דיני עבודה, פיטורים
  | 'diagnostic'               // אבחון פסיכודיאגנוסטי, DSM
  | 'addiction'                // התמכרויות כבדות

export interface ExternalDomainDetection {
  detected: boolean
  domain?: ExternalDomainType
  domainDisplayName?: string
  triggerWords?: string[]
  specialistType?: string
}

// Trigger words for each domain
const DOMAIN_TRIGGERS: Record<ExternalDomainType, {
  displayName: string
  specialistType: string
  triggers: string[]
}> = {
  'neurological-attention': {
    displayName: 'נוירולוגי/קשב',
    specialistType: 'מומחה לקשב והפרעות קשב',
    triggers: [
      'הפרעת קשב',
      'ADHD',
      'ADD',
      'קונצרטה',
      'ריטלין',
      'נוירולוג',
      'אבחון קשב',
      'טיפול תרופתי לקשב',
      'בעיות קשב',
      'קשיי ריכוז חמורים',
      'ויואנס',
      'אטומוקסטין',
      'סטראטרה'
    ]
  },
  'psychiatric': {
    displayName: 'פסיכיאטרי',
    specialistType: 'מומחה לפסיכיאטריה ותרופות',
    triggers: [
      'פסיכיאטר',
      'תרופות פסיכיאטריות',
      'SSRI',
      'נוגדי דיכאון',
      'מייצבי מצב רוח',
      'תופעות לוואי קשות',
      'אשפוז פסיכיאטרי',
      'ליתיום',
      'אנטי פסיכוטי',
      'בנזודיאזפינים',
      'קלונקס',
      'ציפרלקס',
      'סרוקסט',
      'לקספרו'
    ]
  },
  'medical': {
    displayName: 'רפואי',
    specialistType: 'מומחה להיבטים רפואיים',
    triggers: [
      'מחלה כרונית',
      'נוירולוגי',
      'אבחון רפואי',
      'MRI',
      'EEG',
      'בדיקות דם',
      'תסמונת',
      'ניתוח',
      'אפילפסיה',
      'סרטן',
      'סכרת',
      'מחלת לב',
      'אוטואימונית'
    ]
  },
  'legal': {
    displayName: 'משפטי',
    specialistType: 'מומחה להיבטים משפטיים',
    triggers: [
      'עורך דין',
      'עו״ד',
      'עו"ד',
      'תביעה',
      'הטרדה מינית',
      'אלימות במשפחה',
      'צו הרחקה',
      'משטרה',
      'הגשת תלונה',
      'חוזה משפטי',
      'הסכם משפטי',
      'גירושין',
      'משמורת',
      'צו מניעה'
    ]
  },
  'financial': {
    displayName: 'פיננסי',
    specialistType: 'מומחה להיבטים פיננסיים',
    triggers: [
      'חובות כבדים',
      'חדלות פירעון',
      'פשיטת רגל',
      'עיקול',
      'משכנתא שלא מצליח לשלם',
      'הלוואות ענק',
      'יועץ פיננסי',
      'רואה חשבון',
      'חובות של מאות אלפים',
      'הוצאה לפועל',
      'קריסה כלכלית'
    ]
  },
  'employment-legal': {
    displayName: 'דיני עבודה',
    specialistType: 'מומחה לדיני עבודה',
    triggers: [
      'פיטורים לא חוקיים',
      'הרעה מוחשית בתנאים',
      'אפליה בעבודה',
      'התעמרות בעבודה',
      'בית הדין לעבודה',
      'הטרדה בעבודה',
      'שימוע',
      'זכויות עובדים'
    ]
  },
  'diagnostic': {
    displayName: 'אבחוני',
    specialistType: 'מומחה לאבחון פסיכולוגי',
    triggers: [
      'אבחון דידקטי',
      'אבחון פסיכודיאגנוסטי',
      'DSM',
      'אבחנה רשמית',
      'הערכה פסיכולוגית',
      'מבחנים פסיכומטריים',
      'אבחון לקויות למידה'
    ]
  },
  'addiction': {
    displayName: 'התמכרויות',
    specialistType: 'מומחה להתמכרויות',
    triggers: [
      'שימוש כבד בסמים',
      'אלכוהוליזם',
      'התמכרות להימורים',
      'מריחואנה כל היום',
      'גמילה',
      'סמים קשים',
      'קוקאין',
      'הרואין',
      'שתייה מופרזת',
      'אלכוהול כל יום'
    ]
  }
}

/**
 * Detects if the user's message mentions an external domain
 */
export function detectExternalDomain(userMessage: string): ExternalDomainDetection {
  const normalizedMessage = userMessage.toLowerCase()
  
  for (const [domainType, config] of Object.entries(DOMAIN_TRIGGERS)) {
    const matchedTriggers: string[] = []
    
    for (const trigger of config.triggers) {
      if (normalizedMessage.includes(trigger.toLowerCase())) {
        matchedTriggers.push(trigger)
      }
    }
    
    if (matchedTriggers.length > 0) {
      return {
        detected: true,
        domain: domainType as ExternalDomainType,
        domainDisplayName: config.displayName,
        triggerWords: matchedTriggers,
        specialistType: config.specialistType
      }
    }
  }
  
  return { detected: false }
}

/**
 * Gets the clarifying question to ask the user when an external domain is detected
 */
export function getExternalDomainClarificationQuestion(detection: ExternalDomainDetection): string {
  return `אתה הזכרת נושא שהוא מחוץ למנדט הישיר של חברי הפרלמנט (${detection.domainDisplayName}). תרצה שנוסיף לשיחה ${detection.specialistType} שייתן מידע וזווית כללית, אך לא יבצע אבחון או ימליץ על טיפול/צעד משפטי/מהלך פיננסי קונקרטי?`
}

/**
 * Gets all domain types for reference
 */
export function getAllExternalDomainTypes(): ExternalDomainType[] {
  return Object.keys(DOMAIN_TRIGGERS) as ExternalDomainType[]
}
