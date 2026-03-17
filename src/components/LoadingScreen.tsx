import { Gem } from 'lucide-react';

export function LoadingScreen() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center space-y-4">
        <div className="p-3 bg-blue-600 rounded-xl">
          <Gem className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-xl font-semibold text-slate-900">ClearContract</h1>
        <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
      </div>
    </div>
  );
}
