interface YandexLogoIconProps {
  className?: string;
}

/** Знак Яндекса (красный круг с «Я»), для кнопки «Войти с Яндекс ID». */
export function YandexLogoIcon({ className }: YandexLogoIconProps) {
  return (
    <svg
      aria-hidden
      className={className}
      focusable="false"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" fill="#FC3F1D" r="12" />
      <path
        d="M13.32 7.666h-.924c-1.694 0-2.585.858-2.585 2.123 0 1.43.616 2.1 1.881 2.959l1.045.704-3.003 4.487H7.49l2.695-4.014c-1.55-1.111-2.42-2.19-2.42-4.015 0-2.288 1.595-3.85 4.62-3.85h3.003v11.868H13.32V7.666z"
        fill="#fff"
      />
    </svg>
  );
}
