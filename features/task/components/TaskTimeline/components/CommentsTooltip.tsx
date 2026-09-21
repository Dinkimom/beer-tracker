'use client';

import type { IssueComment } from '@/types/tracker';

import { useState, useEffect, useRef } from 'react';

import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { ZIndex } from '@/constants';

interface CommentsTooltipProps {
  comments: IssueComment[];
}

export function CommentsTooltip({ comments }: CommentsTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const elementRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      if (elementRef.current) {
        const rect = elementRef.current.getBoundingClientRect();
        setPosition({
          top: rect.top - 8,
          left: rect.left + rect.width / 2,
        });
        setIsVisible(true);
      }
    }, 300);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (comments.length === 0) {
    return null;
  }

  return (
    <>
      <div
        ref={elementRef}
        className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors cursor-pointer"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <Icon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" name="comment" />
        <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
          {comments.length}
        </span>
      </div>
      {isVisible && (
        <div
          className={`fixed ${ZIndex.class('tooltip')} bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 pointer-events-none max-w-md`}
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="overflow-y-auto max-h-96 rounded-lg">
            {comments.map((comment, index) => {
              const getInitials = (name: string) => {
                const parts = name.trim().split(' ');
                if (parts.length >= 2) {
                  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
                }
                return name.substring(0, 2).toUpperCase();
              };

              const initials = getInitials(comment.createdBy.display);

              return (
                <div
                  key={comment.id}
                  className={`px-4 py-3 ${index !== comments.length - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''}`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Avatar
                      className="flex-shrink-0 shadow-sm"
                      initials={initials}
                      initialsVariant="primary"
                      size="md"
                    />

                    {/* Автор и дата в одну строку */}
                    <div className="flex-1 flex items-center justify-between gap-3 min-w-0">
                      <div className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                        {comment.createdBy.display}
                      </div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 whitespace-nowrap flex-shrink-0">
                        {new Date(comment.createdAt).toLocaleString('ru-RU', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words leading-relaxed pl-10">
                    {comment.text}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1.5 border-8 border-transparent border-t-white dark:border-t-gray-800"></div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-2 border-8 border-transparent border-t-gray-200 dark:border-t-gray-700"></div>
        </div>
      )}
    </>
  );
}
