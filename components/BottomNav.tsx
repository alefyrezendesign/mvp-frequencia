
import React from 'react';
import { 
  ClipboardList, 
  LayoutDashboard, 
  Users, 
  HeartHandshake, 
  Lightbulb 
} from 'lucide-react';
import { AppTab } from '../types';

interface BottomNavProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'register', label: 'Registrar', icon: ClipboardList },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'members', label: 'Membros', icon: Users },
    { id: 'followup', label: 'Pastoral', icon: HeartHandshake },
    { id: 'tips', label: 'Dicas', icon: Lightbulb },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-lg border-t border-zinc-800 px-2 pb-6 pt-2">
      <div className="max-w-5xl mx-auto flex justify-between items-center">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as AppTab)}
            className={`flex flex-col items-center flex-1 transition-all duration-300 py-1 ${
              activeTab === tab.id ? 'text-purple-500 scale-110' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <tab.icon className={`w-6 h-6 mb-1 ${activeTab === tab.id ? 'fill-purple-500/20' : ''}`} />
            <span className="text-[10px] font-medium">{tab.label}</span>
            {activeTab === tab.id && (
              <div className="w-1 h-1 bg-purple-500 rounded-full mt-1"></div>
            )}
          </button>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
