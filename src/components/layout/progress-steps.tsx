'use client';

import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface Step {
  id: number;
  name: string;
  description: string;
}

const steps: Step[] = [
  { id: 1, name: 'Profile', description: 'Personal information & goals' },
  { id: 2, name: 'Schedule', description: 'Weekly routine' },
  { id: 3, name: 'Preferences', description: 'Diet & lifestyle' },
  { id: 4, name: 'Targets', description: 'Review nutrition' },
  { id: 5, name: 'Meal Plan', description: 'AI generation & export' },
];

interface ProgressStepsProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export function ProgressSteps({ currentStep, onStepClick }: ProgressStepsProps) {
  return (
    <nav aria-label="Progress" className="py-8">
      <ol role="list" className="flex items-center justify-between">
        {steps.map((step, stepIdx) => (
          <li key={step.name} className="relative flex-1">
            {step.id < currentStep ? (
              // Completed step
              <div className="group flex flex-col items-center">
                <span className="flex items-center">
                  <span
                    className={cn(
                      'relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-accent cursor-pointer',
                      onStepClick && 'hover:bg-accent/80'
                    )}
                    onClick={() => onStepClick?.(step.id)}
                  >
                    <Check className="h-5 w-5 text-accent-foreground" />
                  </span>
                </span>
                <span className="mt-2 text-sm font-medium text-foreground">{step.name}</span>
                <span className="text-xs text-muted-foreground hidden sm:block">{step.description}</span>
              </div>
            ) : step.id === currentStep ? (
              // Current step
              <div className="group flex flex-col items-center" aria-current="step">
                <span className="flex items-center">
                  <span className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 border-accent bg-background">
                    <span className="h-3 w-3 rounded-full bg-accent" />
                  </span>
                </span>
                <span className="mt-2 text-sm font-medium text-accent">{step.name}</span>
                <span className="text-xs text-muted-foreground hidden sm:block">{step.description}</span>
              </div>
            ) : (
              // Upcoming step
              <div className="group flex flex-col items-center">
                <span className="flex items-center">
                  <span className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 border-muted bg-background">
                    <span className="h-3 w-3 rounded-full bg-transparent" />
                  </span>
                </span>
                <span className="mt-2 text-sm font-medium text-muted-foreground">{step.name}</span>
                <span className="text-xs text-muted-foreground hidden sm:block">{step.description}</span>
              </div>
            )}

            {/* Connector line */}
            {stepIdx !== steps.length - 1 && (
              <div
                className={cn(
                  'absolute top-5 left-[calc(50%+20px)] w-[calc(100%-40px)] h-0.5',
                  step.id < currentStep ? 'bg-accent' : 'bg-muted'
                )}
                aria-hidden="true"
              />
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
