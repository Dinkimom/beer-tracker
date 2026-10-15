import type { McpOAuthClientBrand } from '@/lib/mcp/oauth/resolveMcpOAuthClientBrand';

import { McpOAuthBeerTrackerMark } from './McpOAuthBeerTrackerMark';
import { McpOAuthClientMark } from './McpOAuthClientMark';

export function McpOAuthConsentBrandPair({
  beerLabel,
  brand,
  clientLabel,
}: {
  beerLabel: string;
  brand: McpOAuthClientBrand;
  clientLabel: string;
}) {
  return (
    <div className="flex items-center justify-center gap-3 sm:gap-4">
      <div className="flex flex-col items-center gap-2">
        <McpOAuthClientMark brand={brand} label={clientLabel} />
        <span className="max-w-[7.5rem] truncate text-center text-xs font-medium text-gray-500 dark:text-gray-400">
          {clientLabel}
        </span>
      </div>

      <div
        aria-hidden
        className="mb-5 flex items-center gap-1 text-gray-400 dark:text-gray-500"
      >
        <span className="h-px w-4 bg-current opacity-50 sm:w-6" />
        <svg className="h-5 w-5 animate-pulse" fill="none" viewBox="0 0 24 24">
          <path
            d="M5 12h12m0 0-4-4m4 4-4 4"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.75"
          />
        </svg>
        <span className="h-px w-4 bg-current opacity-50 sm:w-6" />
      </div>

      <div className="flex flex-col items-center gap-2">
        <McpOAuthBeerTrackerMark label={beerLabel} />
        <span className="max-w-[7.5rem] truncate text-center text-xs font-medium text-gray-500 dark:text-gray-400">
          {beerLabel}
        </span>
      </div>
    </div>
  );
}
