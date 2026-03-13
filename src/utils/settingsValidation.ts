export type FieldType = 'dollar' | 'date' | 'employeeCount' | 'text';

export interface ValidationResult {
  valid: boolean;
  error?: string;
  warning?: string;
  formatted?: string;
}

const dollarFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function validateDollar(raw: string): ValidationResult {
  const stripped = raw.replace(/[$,\s]/g, '');
  if (stripped === '') return { valid: true };

  if (!/^\d+(\.\d+)?$/.test(stripped)) {
    return { valid: false, error: 'Enter a dollar amount (e.g., $1,000,000)' };
  }

  const num = parseFloat(stripped);
  const formatted = dollarFormatter.format(num);
  return { valid: true, formatted };
}

function validateDate(raw: string): ValidationResult {
  if (raw.trim() === '') return { valid: true };

  const parsed = new Date(raw + 'T00:00:00');
  if (isNaN(parsed.getTime())) {
    return { valid: false, error: 'Enter a valid date' };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (parsed < today) {
    return { valid: true, warning: 'This date has passed' };
  }

  return { valid: true };
}

function validateEmployeeCount(raw: string): ValidationResult {
  const trimmed = raw.trim();
  if (trimmed === '') return { valid: true };

  if (!/^\d+(\s*-\s*\d+)?$/.test(trimmed)) {
    return { valid: false, error: 'Enter a number or range (e.g., 15-25)' };
  }

  const formatted = trimmed.replace(/\s*-\s*/, '-');
  return { valid: true, formatted };
}

export function validateField(
  value: string,
  fieldType: FieldType
): ValidationResult {
  if (value === '') return { valid: true };

  switch (fieldType) {
    case 'dollar':
      return validateDollar(value);
    case 'date':
      return validateDate(value);
    case 'employeeCount':
      return validateEmployeeCount(value);
    case 'text':
      return { valid: true };
  }
}
