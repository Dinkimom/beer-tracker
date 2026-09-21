'use client';

import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
  type Ref,
  type RefObject,
} from 'react';

import { Button } from '@/components/Button';
import { customSelectChevronClassName, customSelectTriggerClassName } from '@/components/customSelectHelpers';
import { Icon } from '@/components/Icon';

interface CustomSelectTriggerProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children' | 'className' | 'disabled' | 'title' | 'type'
> {
  buttonRef: RefObject<HTMLButtonElement | null>;
  className?: string;
  disabled: boolean;
  isIconTrigger: boolean;
  isOpen: boolean;
  size: 'compact' | 'default';
  title?: string;
  triggerInner: ReactNode;
}

function assignRef<T>(ref: Ref<T> | undefined, value: T | null): void {
  if (typeof ref === 'function') {
    ref(value);
    return;
  }
  if (ref) {
    ref.current = value;
  }
}

export const CustomSelectTrigger = forwardRef<HTMLButtonElement, CustomSelectTriggerProps>(
  function CustomSelectTrigger(
    {
      buttonRef,
      className,
      disabled,
      isIconTrigger,
      isOpen,
      size,
      title,
      triggerInner,
      ...props
    },
    ref
  ) {
    return (
      <Button
        {...props}
        ref={(node) => {
          assignRef(buttonRef, node);
          assignRef(ref, node);
        }}
        aria-expanded={isOpen}
        aria-label={isIconTrigger ? title : undefined}
        className={customSelectTriggerClassName(isIconTrigger, size, className)}
        disabled={disabled}
        title={title}
        type="button"
        variant={isIconTrigger ? 'ghost' : 'outline'}
      >
        {isIconTrigger ? (
          triggerInner
        ) : (
          <span className="flex min-w-0 flex-1 items-center text-left">{triggerInner}</span>
        )}
        {!isIconTrigger ? (
          <Icon className={customSelectChevronClassName(size, isOpen)} name="chevron-down" />
        ) : null}
      </Button>
    );
  }
);
