import React, { useRef } from 'react';
import { Finding } from '../types/contract';
import { SeverityBadge } from './SeverityBadge';
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
  BoxIcon } from
'lucide-react';
import { motion } from 'framer-motion';
interface FindingCardProps {
  finding: Finding;
  index: number;
}
const categoryIcons: Record<string, BoxIcon> = {
  'Legal Issues': Scale,
  'Scope of Work': ClipboardList,
  'Contract Compliance': ShieldCheck,
  'Labor Compliance': HardHat,
  'Insurance Requirements': Shield,
  'Important Dates': Calendar,
  'Financial Terms': DollarSign,
  'Technical Standards': Ruler,
  'Risk Assessment': AlertTriangle
};
export function FindingCard({ finding, index }: FindingCardProps) {
  const Icon = categoryIcons[finding.category] || AlertTriangle;
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 10
      }}
      animate={{
        opacity: 1,
        y: 0
      }}
      transition={{
        delay: index * 0.05
      }}
      className="bg-white rounded-lg border border-slate-200 p-5 hover:shadow-sm transition-shadow">

      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-slate-100 rounded-md text-slate-600">
            <Icon className="w-4 h-4" />
          </div>
          <span className="text-sm font-medium text-slate-600">
            {finding.category}
          </span>
        </div>
        <SeverityBadge severity={finding.severity} />
      </div>

      <h4 className="text-lg font-semibold text-slate-900 mb-2">
        {finding.title}
      </h4>
      <p className="text-slate-600 mb-4 text-sm leading-relaxed">
        {finding.description}
      </p>

      {finding.recommendation &&
      <div className="bg-blue-50 border border-blue-100 rounded-md p-3 mb-3">
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">
            Recommendation
          </p>
          <p className="text-sm text-blue-800">{finding.recommendation}</p>
        </div>
      }

      {finding.clauseReference &&
      <div className="flex items-center text-xs text-slate-400 mt-2">
          <span className="font-medium mr-1">Reference:</span>{' '}
          {finding.clauseReference}
        </div>
      }
    </motion.div>);

}