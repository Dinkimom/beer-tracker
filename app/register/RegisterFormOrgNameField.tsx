'use client';

import { Input } from '@/components/Input';
import { useI18n } from '@/contexts/LanguageContext';

interface RegisterFormOrgNameFieldProps {
  onboardingMode: boolean;
  organizationName: string;
  onOrganizationNameChange: (value: string) => void;
}

export function RegisterFormOrgNameField({
  onboardingMode,
  organizationName,
  onOrganizationNameChange,
}: RegisterFormOrgNameFieldProps) {
  const { t } = useI18n();
  if (!onboardingMode) {
    return null;
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="reg-org-name">
        {t('productAuth.register.orgName')}
      </label>
      <Input
        className="mt-1"
        id="reg-org-name"
        required
        type="text"
        value={organizationName}
        onChange={(e) => onOrganizationNameChange(e.target.value)}
      />
    </div>
  );
}
