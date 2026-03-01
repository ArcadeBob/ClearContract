import React, { useState } from 'react';
import {
  Shield,
  Scale,
  ClipboardList,
  ShieldCheck,
  HardHat,
  Calendar,
  DollarSign,
  Ruler,
  AlertTriangle,
  Link2,
  Bell,
  Cpu,
  CheckCircle2,
  ExternalLink,
  ToggleLeft,
  ToggleRight } from
'lucide-react';
import { motion } from 'framer-motion';
export function Settings() {
  const [playbooks, setPlaybooks] = useState([
  {
    id: 'legal',
    label: 'Legal Issues',
    icon: Scale,
    enabled: true,
    desc: 'Indemnification, liability, dispute resolution, termination clauses'
  },
  {
    id: 'scope',
    label: 'Scope of Work',
    icon: ClipboardList,
    enabled: true,
    desc: 'Scope definition, exclusions, change order procedures'
  },
  {
    id: 'compliance',
    label: 'Contract Compliance',
    icon: ShieldCheck,
    enabled: true,
    desc: 'AIA/ConsensusDocs compliance, flow-down provisions'
  },
  {
    id: 'labor',
    label: 'Labor Compliance',
    icon: HardHat,
    enabled: true,
    desc: 'Prevailing wage, California Labor Code, licensing'
  },
  {
    id: 'insurance',
    label: 'Insurance Requirements',
    icon: Shield,
    enabled: true,
    desc: 'GL, workers comp, auto, umbrella coverage'
  },
  {
    id: 'dates',
    label: 'Important Dates',
    icon: Calendar,
    enabled: true,
    desc: 'Start dates, milestones, deadlines, warranty periods'
  },
  {
    id: 'financial',
    label: 'Financial Terms',
    icon: DollarSign,
    enabled: true,
    desc: 'Payment terms, retention, lien waivers, bonding'
  },
  {
    id: 'technical',
    label: 'Technical Standards',
    icon: Ruler,
    enabled: true,
    desc: 'AAMA specs, glazing performance, material requirements'
  },
  {
    id: 'risk',
    label: 'Risk Assessment',
    icon: AlertTriangle,
    enabled: true,
    desc: 'Liquidated damages, consequential damages, force majeure'
  }]
  );
  const [notifications, setNotifications] = useState({
    criticalAlerts: true,
    weeklyDigest: true,
    complianceUpdates: true,
    reviewComplete: false
  });
  const togglePlaybook = (id: string) => {
    setPlaybooks((prev) =>
    prev.map((p) =>
    p.id === id ?
    {
      ...p,
      enabled: !p.enabled
    } :
    p
    )
    );
  };
  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header className="bg-white border-b border-slate-200 px-8 py-6 shrink-0">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">
          Configure your contract review preferences
        </p>
      </header>

      <div className="flex-1 overflow-auto bg-slate-50 p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Review Playbooks */}
          <motion.section
            initial={{
              opacity: 0,
              y: 12
            }}
            animate={{
              opacity: 1,
              y: 0
            }}
            className="bg-white rounded-xl border border-slate-200 overflow-hidden">

            <div className="px-6 py-5 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">
                Review Playbooks
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Toggle which analysis categories the AI engine evaluates during
                contract review.
              </p>
            </div>
            <div className="divide-y divide-slate-100">
              {playbooks.map((playbook) => {
                const Icon = playbook.icon;
                return (
                  <div
                    key={playbook.id}
                    className="flex items-center justify-between px-6 py-4">

                    <div className="flex items-center space-x-4">
                      <div
                        className={`p-2 rounded-lg ${playbook.enabled ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>

                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p
                          className={`text-sm font-medium ${playbook.enabled ? 'text-slate-900' : 'text-slate-400'}`}>

                          {playbook.label}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {playbook.desc}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => togglePlaybook(playbook.id)}
                      className="shrink-0">

                      {playbook.enabled ?
                      <ToggleRight className="w-8 h-8 text-blue-600" /> :

                      <ToggleLeft className="w-8 h-8 text-slate-300" />
                      }
                    </button>
                  </div>);

              })}
            </div>
          </motion.section>

          {/* Integrations */}
          <motion.section
            initial={{
              opacity: 0,
              y: 12
            }}
            animate={{
              opacity: 1,
              y: 0
            }}
            transition={{
              delay: 0.1
            }}
            className="bg-white rounded-xl border border-slate-200 overflow-hidden">

            <div className="px-6 py-5 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">
                Integrations
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Connect your project management tools for seamless data flow.
              </p>
            </div>
            <div className="divide-y divide-slate-100">
              {/* Procore */}
              <div className="flex items-center justify-between px-6 py-5">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Link2 className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      Procore
                    </p>
                    <p className="text-xs text-slate-400">
                      Project management & document sync
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Connected
                  </span>
                  <button className="text-xs text-slate-500 hover:text-slate-700 flex items-center">
                    Configure <ExternalLink className="w-3 h-3 ml-1" />
                  </button>
                </div>
              </div>

              {/* BuildOps */}
              <div className="flex items-center justify-between px-6 py-5">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Link2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      BuildOps
                    </p>
                    <p className="text-xs text-slate-400">
                      Field operations & service management
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Connected
                  </span>
                  <button className="text-xs text-slate-500 hover:text-slate-700 flex items-center">
                    Configure <ExternalLink className="w-3 h-3 ml-1" />
                  </button>
                </div>
              </div>

              {/* Document Crunch */}
              <div className="flex items-center justify-between px-6 py-5">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                    <Link2 className="w-5 h-5 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      Document Crunch
                    </p>
                    <p className="text-xs text-slate-400">
                      AI contract analysis engine
                    </p>
                  </div>
                </div>
                <button className="text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full transition-colors">
                  Connect
                </button>
              </div>
            </div>
          </motion.section>

          {/* Notifications */}
          <motion.section
            initial={{
              opacity: 0,
              y: 12
            }}
            animate={{
              opacity: 1,
              y: 0
            }}
            transition={{
              delay: 0.2
            }}
            className="bg-white rounded-xl border border-slate-200 overflow-hidden">

            <div className="px-6 py-5 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">
                Notifications
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Manage how you receive alerts and updates.
              </p>
            </div>
            <div className="divide-y divide-slate-100">
              {[
              {
                key: 'criticalAlerts' as const,
                label: 'Critical Finding Alerts',
                desc: 'Immediate notification when critical risks are identified',
                icon: AlertTriangle
              },
              {
                key: 'weeklyDigest' as const,
                label: 'Weekly Digest',
                desc: 'Summary of all contract reviews and findings',
                icon: Calendar
              },
              {
                key: 'complianceUpdates' as const,
                label: 'Compliance Updates',
                desc: 'California labor code and regulation changes',
                icon: ShieldCheck
              },
              {
                key: 'reviewComplete' as const,
                label: 'Review Complete',
                desc: 'Notification when AI analysis finishes',
                icon: CheckCircle2
              }].
              map((item) => {
                const Icon = item.icon;
                const enabled = notifications[item.key];
                return (
                  <div
                    key={item.key}
                    className="flex items-center justify-between px-6 py-4">

                    <div className="flex items-center space-x-4">
                      <div
                        className={`p-2 rounded-lg ${enabled ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>

                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p
                          className={`text-sm font-medium ${enabled ? 'text-slate-900' : 'text-slate-400'}`}>

                          {item.label}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleNotification(item.key)}
                      className="shrink-0">

                      {enabled ?
                      <ToggleRight className="w-8 h-8 text-blue-600" /> :

                      <ToggleLeft className="w-8 h-8 text-slate-300" />
                      }
                    </button>
                  </div>);

              })}
            </div>
          </motion.section>

          {/* AI Model Info */}
          <motion.section
            initial={{
              opacity: 0,
              y: 12
            }}
            animate={{
              opacity: 1,
              y: 0
            }}
            transition={{
              delay: 0.3
            }}
            className="bg-white rounded-xl border border-slate-200 overflow-hidden">

            <div className="px-6 py-5 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">
                AI Engine
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Contract analysis model information and training data.
              </p>
            </div>
            <div className="px-6 py-5">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Model Version
                  </p>
                  <p className="text-sm font-semibold text-slate-900 mt-1">
                    v2.4.1
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Last Updated
                  </p>
                  <p className="text-sm font-semibold text-slate-900 mt-1">
                    Jan 15, 2024
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Training Contracts
                  </p>
                  <p className="text-sm font-semibold text-slate-900 mt-1">
                    2,847 documents
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Accuracy Rate
                  </p>
                  <p className="text-sm font-semibold text-slate-900 mt-1">
                    94.2%
                  </p>
                </div>
              </div>
              <div className="mt-6 pt-5 border-t border-slate-100">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                  Training Data Includes
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                  'AAMA Standards',
                  'AIA Forms',
                  'ConsensusDocs',
                  'EJCDC',
                  'CA Labor Code',
                  'CA Lien Laws',
                  'Glazing Contracts'].
                  map((tag) =>
                  <span
                    key={tag}
                    className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">

                      {tag}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </motion.section>
        </div>
      </div>
    </div>);

}