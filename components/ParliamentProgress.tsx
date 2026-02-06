'use client'

type ParliamentStage = 'idle' | 'experts' | 'synthesis' | 'chair'

interface ParliamentProgressProps {
  stage: ParliamentStage
}

export default function ParliamentProgress({ stage }: ParliamentProgressProps) {
  if (stage === 'idle') return null

  const steps = [
    { id: 'experts', label: 'התייעצות מומחים', description: 'הפרלמנט מתייעץ עבורך…' },
    { id: 'synthesis', label: 'סינתזת שאלה', description: 'מסדרים לך את השאלה והתשובות המדויקות…' },
    { id: 'chair', label: 'מסקנת יו"ר', description: 'היו"ר מגבש עבורך מסקנה סופית…' }
  ]

  const currentIndex = steps.findIndex(s => s.id === stage)
  const currentStep = steps[currentIndex]

  return (
    <div className="w-full py-4 px-2">
      {/* Progress steps */}
      <div className="flex items-center justify-center gap-4 mb-3">
        {steps.map((step, index) => {
          const isCompleted = index < currentIndex
          const isCurrent = index === currentIndex
          const isPending = index > currentIndex

          return (
            <div key={step.id} className="flex items-center">
              {/* Step circle */}
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold
                  transition-all duration-300
                  ${isCompleted ? 'bg-green-500 text-white' : ''}
                  ${isCurrent ? 'bg-blue-500 text-white animate-pulse' : ''}
                  ${isPending ? 'bg-gray-200 text-gray-400' : ''}
                `}
              >
                {isCompleted ? '✓' : index + 1}
              </div>

              {/* Connecting line */}
              {index < steps.length - 1 && (
                <div
                  className={`
                    w-12 h-1 mx-2 transition-all duration-300
                    ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}
                  `}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Current step description */}
      {currentStep && (
        <div className="text-center">
          <p className="text-sm text-gray-600 font-medium">{currentStep.description}</p>
        </div>
      )}
    </div>
  )
}
