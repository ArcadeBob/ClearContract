import {
  Scale,
  ClipboardList,
  ShieldCheck,
  HardHat,
  Shield,
  Calendar,
  DollarSign,
  Ruler,
  AlertTriangle,
  Layers,
  type LucideIcon,
} from 'lucide-react';

export const categoryIcons: Record<string, LucideIcon> = {
  'Legal Issues': Scale,
  'Scope of Work': ClipboardList,
  'Contract Compliance': ShieldCheck,
  'Labor Compliance': HardHat,
  'Insurance Requirements': Shield,
  'Important Dates': Calendar,
  'Financial Terms': DollarSign,
  'Technical Standards': Ruler,
  'Risk Assessment': AlertTriangle,
  'Compound Risk': Layers,
};
