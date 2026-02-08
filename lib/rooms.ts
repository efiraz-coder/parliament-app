// Private Rooms - Segmented by demographic
export interface Room {
  id: string
  name: string
  nameEn: string
  description: string
  icon: string
  color: string
  bgGradient: string
  questions: ProvocativeQuestion[]
}

export interface ProvocativeQuestion {
  id: string
  text: string
  category: string
  expertCount: number
  communityCount: number
  isBookmarked?: boolean
}

// Gender options for onboarding
export const GENDER_OPTIONS = [
  { id: 'female', label: 'אישה', icon: '👩' },
  { id: 'male', label: 'גבר', icon: '👨' },
  { id: 'other', label: 'אחר', icon: '🧑' },
] as const

// Age group options for onboarding
export const AGE_GROUPS = [
  { id: '18-35', label: '18-35', description: 'קריירה, זוגיות, בניית עתיד' },
  { id: '36-50', label: '36-50', description: 'אמצע החיים, משפחה, קריירה בשיא' },
  { id: '51-65', label: '51-65', description: 'מעבר, שינויים גופניים, ילדים עוזבים' },
  { id: '66-75', label: '66-75', description: 'פרישה, בריאות, משמעות חדשה' },
  { id: '76+', label: '76+', description: 'זקנה, מורשת, חוכמה' },
] as const

export type GenderId = typeof GENDER_OPTIONS[number]['id']
export type AgeGroupId = typeof AGE_GROUPS[number]['id']

// The Private Rooms
export const ROOMS: Room[] = [
  {
    id: 'menopause',
    name: 'מנופאוזה',
    nameEn: 'Menopause',
    description: 'מרחב בטוח לדבר על השינויים בגוף ובנפש',
    icon: '🌸',
    color: 'text-pink-600',
    bgGradient: 'from-pink-50 to-rose-100 dark:from-pink-950 dark:to-rose-900',
    questions: [
      {
        id: 'meno-1',
        text: 'למה אף אחד לא הזהיר אותי שהמנופאוזה תשנה לי את הזהות?',
        category: 'זהות',
        expertCount: 12,
        communityCount: 89,
      },
      {
        id: 'meno-2',
        text: 'האם הגלי חום האלה יעצרו אי פעם, או שזה החיים החדשים שלי?',
        category: 'גוף',
        expertCount: 8,
        communityCount: 156,
      },
      {
        id: 'meno-3',
        text: 'איך מדברים עם בן הזוג על כך שהמגע השתנה לגמרי?',
        category: 'זוגיות',
        expertCount: 15,
        communityCount: 67,
      },
      {
        id: 'meno-4',
        text: 'מה עושים כשהזיכרון מתחיל לבגוד ואת מפחדת שזה לא רק גיל?',
        category: 'בריאות',
        expertCount: 22,
        communityCount: 134,
      },
    ],
  },
  {
    id: 'women-70',
    name: 'נשים 70+',
    nameEn: 'Women 70+',
    description: 'חוכמת חיים, אתגרים ייחודיים, קהילה תומכת',
    icon: '👵',
    color: 'text-purple-600',
    bgGradient: 'from-purple-50 to-violet-100 dark:from-purple-950 dark:to-violet-900',
    questions: [
      {
        id: 'w70-1',
        text: 'איך לא להפוך לבלתי נראית בחברה שמעריצה צעירות?',
        category: 'זהות',
        expertCount: 18,
        communityCount: 203,
      },
      {
        id: 'w70-2',
        text: 'מה עושים עם הבדידות הזו שאף אחד לא מדבר עליה?',
        category: 'רגש',
        expertCount: 25,
        communityCount: 178,
      },
      {
        id: 'w70-3',
        text: 'איך שומרים על עצמאות כשהגוף מתחיל לסרב לשתף פעולה?',
        category: 'עצמאות',
        expertCount: 14,
        communityCount: 145,
      },
      {
        id: 'w70-4',
        text: 'האם מאוחר מדי להתחיל משהו חדש לגמרי?',
        category: 'משמעות',
        expertCount: 20,
        communityCount: 89,
      },
    ],
  },
  {
    id: 'men-70',
    name: 'גברים 70+',
    nameEn: 'Men 70+',
    description: 'מרחב לדבר על מה שגברים לא מדברים עליו',
    icon: '👴',
    color: 'text-blue-600',
    bgGradient: 'from-blue-50 to-sky-100 dark:from-blue-950 dark:to-sky-900',
    questions: [
      {
        id: 'm70-1',
        text: 'מה נשאר ממני אחרי שהקריירה נגמרה והילדים לא צריכים אותי?',
        category: 'זהות',
        expertCount: 16,
        communityCount: 167,
      },
      {
        id: 'm70-2',
        text: 'למה כל כך קשה לי לדבר על הפחדים שלי, אפילו עם עצמי?',
        category: 'רגש',
        expertCount: 21,
        communityCount: 198,
      },
      {
        id: 'm70-3',
        text: 'איך מתמודדים עם אובדן היכולת הגופנית בלי לאבד את הכבוד העצמי?',
        category: 'גוף',
        expertCount: 13,
        communityCount: 156,
      },
      {
        id: 'm70-4',
        text: 'האם אני חייב למות לבד רק כי לא למדתי לבקש עזרה?',
        category: 'בדידות',
        expertCount: 28,
        communityCount: 234,
      },
    ],
  },
  {
    id: 'career',
    name: 'קריירה',
    nameEn: 'Career',
    description: 'החלטות גדולות על עבודה, כסף ומשמעות',
    icon: '💼',
    color: 'text-amber-600',
    bgGradient: 'from-amber-50 to-yellow-100 dark:from-amber-950 dark:to-yellow-900',
    questions: [
      {
        id: 'career-1',
        text: 'האם זה מטורף להחליף קריירה בגיל הזה, או שלהישאר זה הסיכון האמיתי?',
        category: 'שינוי',
        expertCount: 34,
        communityCount: 312,
      },
      {
        id: 'career-2',
        text: 'איך יודעים אם שחיקה היא סימן לברוח או לסגת ולהתאושש?',
        category: 'שחיקה',
        expertCount: 29,
        communityCount: 287,
      },
      {
        id: 'career-3',
        text: 'כמה כסף באמת צריך כדי להרגיש בטוח, והאם זה בכלל אפשרי?',
        category: 'כלכלה',
        expertCount: 19,
        communityCount: 245,
      },
      {
        id: 'career-4',
        text: 'מה עושים כשהעבודה לא נותנת משמעות אבל משלמת את החשבונות?',
        category: 'משמעות',
        expertCount: 24,
        communityCount: 198,
      },
    ],
  },
  {
    id: 'relationships',
    name: 'זוגיות ומשפחה',
    nameEn: 'Relationships',
    description: 'על אהבה, משפחה והקשרים שמעצבים אותנו',
    icon: '💕',
    color: 'text-red-500',
    bgGradient: 'from-red-50 to-pink-100 dark:from-red-950 dark:to-pink-900',
    questions: [
      {
        id: 'rel-1',
        text: 'איך יודעים אם הקשר הזה שווה להציל או שהגיע הזמן ללכת?',
        category: 'זוגיות',
        expertCount: 41,
        communityCount: 389,
      },
      {
        id: 'rel-2',
        text: 'למה הילדים הבוגרים שלי לא מדברים איתי, ומה אני יכול/ה לעשות?',
        category: 'משפחה',
        expertCount: 27,
        communityCount: 256,
      },
      {
        id: 'rel-3',
        text: 'האם אפשר להתאהב מחדש בבן/בת הזוג אחרי עשרות שנים יחד?',
        category: 'זוגיות',
        expertCount: 18,
        communityCount: 178,
      },
      {
        id: 'rel-4',
        text: 'איך מתמודדים עם הורים מזדקנים בלי לאבד את עצמי בתהליך?',
        category: 'משפחה',
        expertCount: 33,
        communityCount: 312,
      },
    ],
  },
]

// Get recommended rooms based on user profile
export function getRecommendedRooms(gender: GenderId, ageGroup: AgeGroupId): Room[] {
  const rooms: Room[] = []
  
  // Age-based recommendations
  if (ageGroup === '66-75' || ageGroup === '76+') {
    if (gender === 'female') {
      rooms.push(ROOMS.find(r => r.id === 'women-70')!)
    } else if (gender === 'male') {
      rooms.push(ROOMS.find(r => r.id === 'men-70')!)
    }
  }
  
  // Gender-based recommendations for menopause
  if (gender === 'female' && (ageGroup === '36-50' || ageGroup === '51-65')) {
    rooms.push(ROOMS.find(r => r.id === 'menopause')!)
  }
  
  // Universal rooms
  rooms.push(ROOMS.find(r => r.id === 'career')!)
  rooms.push(ROOMS.find(r => r.id === 'relationships')!)
  
  return rooms
}

// Get all rooms
export function getAllRooms(): Room[] {
  return ROOMS
}

// Get room by ID
export function getRoomById(id: string): Room | undefined {
  return ROOMS.find(r => r.id === id)
}
