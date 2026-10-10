interface AtlassianLogoIconProps {
  className?: string;
}

/** Знак Atlassian (синий), для кнопки «Продолжить с Atlassian». */
export function AtlassianLogoIcon({ className }: AtlassianLogoIconProps) {
  return (
    <svg
      aria-hidden
      className={className}
      fill="#2684FF"
      focusable="false"
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M.87 20.55c-.4.55-.35 1.3.12 1.78l8.42 8.42c.48.48 1.24.53 1.78.12C15.37 27.3 18.3 20.8 19.92 15.8L11.74 7.62C6.4 11.3 2.4 16.7.87 20.55zm30.26 0c.4.55.35 1.3-.12 1.78l-8.42 8.42c-.48.48-1.24.53-1.78.12-4.18-3.57-7.11-10.07-8.73-15.07l8.18-8.18c5.34 3.68 9.34 9.08 10.87 12.93zM14.56 1.24c-.48-.48-1.24-.53-1.78-.12C11.3 2.4 7.62 6.4 5.9 10.3l8.18 8.18c2.5-4.6 5.92-8.55 9.23-10.74.55-.4.6-1.16.12-1.64L14.56 1.24z" />
    </svg>
  );
}
