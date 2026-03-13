import { useState, useEffect, useRef, useCallback } from 'react';
import { Shield, Scale, ShieldCheck, HardHat, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCompanyProfile } from '../hooks/useCompanyProfile';
import { validateField, type FieldType } from '../utils/settingsValidation';
import type { CompanyProfile } from '../knowledge/types';

function ProfileField({
  label,
  value,
  onSave,
  type = 'text',
  fieldType,
}: {
  label: string;
  value: string;
  onSave: (v: string) => void;
  type?: string;
  fieldType?: FieldType;
}) {
  const [localValue, setLocalValue] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [showSaved, setShowSaved] = useState(false);
  const focusedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  // Sync localValue when value prop changes externally (but not while focused)
  useEffect(() => {
    if (!focusedRef.current) {
      setLocalValue(value);
    }
  }, [value]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
    setError(null);
  }, []);

  const handleFocus = useCallback(() => {
    focusedRef.current = true;
    setError(null);
  }, []);

  const handleBlur = useCallback(() => {
    focusedRef.current = false;

    const result = validateField(localValue, fieldType || 'text');

    if (!result.valid) {
      setError(result.error || null);
      setLocalValue(value); // revert to last saved
      return;
    }

    setError(null);
    setWarning(result.warning || null);

    const finalValue = result.formatted || localValue;
    setLocalValue(finalValue);

    if (finalValue !== value) {
      onSave(finalValue);
      setShowSaved(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setShowSaved(false), 2000);
    }
  }, [localValue, value, fieldType, onSave]);

  const borderClasses = error
    ? 'border-red-300 focus:ring-red-500'
    : 'border-slate-200 focus:ring-blue-500';

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider">
          {label}
        </label>
        <AnimatePresence>
          {showSaved && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="inline-flex items-center gap-1 text-xs text-emerald-600"
            >
              <Check className="w-3 h-3" />
              Saved
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <input
        type={type}
        value={localValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={`w-full px-3 py-2 border rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:border-transparent ${borderClasses}`}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      {!error && warning && (
        <p className="mt-1 text-xs text-amber-500">{warning}</p>
      )}
    </div>
  );
}

interface CardSection {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  fields: {
    label: string;
    key: keyof CompanyProfile;
    type?: string;
    fieldType?: FieldType;
  }[];
}

export function Settings() {
  const { profile, saveField } = useCompanyProfile();

  const cards: CardSection[] = [
    {
      title: 'Insurance Coverage',
      subtitle:
        'General liability, umbrella, auto, and workers\u2019 compensation limits',
      icon: Shield,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      fields: [
        {
          label: 'GL Per Occurrence',
          key: 'glPerOccurrence',
          fieldType: 'dollar',
        },
        { label: 'GL Aggregate', key: 'glAggregate', fieldType: 'dollar' },
        {
          label: 'Umbrella / Excess',
          key: 'umbrellaLimit',
          fieldType: 'dollar',
        },
        {
          label: 'Auto Combined Single Limit',
          key: 'autoLimit',
          fieldType: 'dollar',
        },
        { label: 'WC Statutory State', key: 'wcStatutoryState' },
        {
          label: "WC Employer's Liability",
          key: 'wcEmployerLiability',
          fieldType: 'dollar',
        },
      ],
    },
    {
      title: 'Bonding Capacity',
      subtitle: 'Single project and aggregate bonding limits',
      icon: Scale,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      fields: [
        {
          label: 'Single Project Limit',
          key: 'bondingSingleProject',
          fieldType: 'dollar',
        },
        {
          label: 'Aggregate Limit',
          key: 'bondingAggregate',
          fieldType: 'dollar',
        },
      ],
    },
    {
      title: 'Licenses & Certifications',
      subtitle: 'Contractor license, DIR registration, and certifications',
      icon: ShieldCheck,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      fields: [
        { label: 'License Type', key: 'contractorLicenseType' },
        { label: 'License Number', key: 'contractorLicenseNumber' },
        {
          label: 'License Expiry',
          key: 'contractorLicenseExpiry',
          type: 'date',
          fieldType: 'date',
        },
        { label: 'DIR Registration', key: 'dirRegistration' },
        { label: 'DIR Expiry', key: 'dirExpiry', type: 'date', fieldType: 'date' },
        { label: 'SBE Cert ID', key: 'sbeCertId' },
        { label: 'SBE Issuer', key: 'sbeCertIssuer' },
        { label: 'LAUSD Vendor / SAP#', key: 'lausdVendorNumber' },
      ],
    },
    {
      title: 'Company Capabilities',
      subtitle: 'Employee count, service area, and typical project size range',
      icon: HardHat,
      iconBg: 'bg-purple-50',
      iconColor: 'text-purple-600',
      fields: [
        {
          label: 'Employee Count',
          key: 'employeeCount',
          fieldType: 'employeeCount',
        },
        { label: 'Service Area', key: 'serviceArea' },
        {
          label: 'Typical Project Min',
          key: 'typicalProjectSizeMin',
          fieldType: 'dollar',
        },
        {
          label: 'Typical Project Max',
          key: 'typicalProjectSizeMax',
          fieldType: 'dollar',
        },
      ],
    },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header className="bg-white border-b border-slate-200 px-8 py-6 shrink-0">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">Configure your company profile</p>
      </header>

      <div className="flex-1 overflow-auto bg-slate-50 p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {cards.map((card, index) => {
            const Icon = card.icon;
            return (
              <motion.section
                key={card.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden"
              >
                <div className="px-6 py-5 border-b border-slate-100 flex items-center space-x-3">
                  <div
                    className={`p-2 rounded-lg ${card.iconBg} ${card.iconColor}`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      {card.title}
                    </h2>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {card.subtitle}
                    </p>
                  </div>
                </div>
                <div className="px-6 py-5">
                  <div className="grid grid-cols-2 gap-4">
                    {card.fields.map((field) => (
                      <ProfileField
                        key={field.key}
                        label={field.label}
                        value={profile[field.key]}
                        onSave={(v) => saveField(field.key, v)}
                        type={field.type}
                        fieldType={field.fieldType}
                      />
                    ))}
                  </div>
                </div>
              </motion.section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
