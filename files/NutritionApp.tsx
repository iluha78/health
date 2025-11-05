import React, { useState } from 'react';
import { DailyFoodTracker } from './DailyFoodTracker';
import { FoodHistory } from './FoodHistory';
import { NutritionAdvicePanel } from './NutritionAdvicePanel';
import './NutritionApp.css';

interface NutritionAppProps {
  token: string;
}

type TabType = 'tracker' | 'history' | 'advice';

export function NutritionApp({ token }: NutritionAppProps) {
  const [activeTab, setActiveTab] = useState<TabType>('tracker');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setActiveTab('tracker');
    // Можно добавить прокрутку к компоненту трекера
  };

  return (
    <div className="nutrition-app">
      <div className="app-tabs">
        <button
          className={`tab-button ${activeTab === 'tracker' ? 'active' : ''}`}
          onClick={() => setActiveTab('tracker')}
        >
          📸 Дневник
        </button>
        <button
          className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          📊 История
        </button>
        <button
          className={`tab-button ${activeTab === 'advice' ? 'active' : ''}`}
          onClick={() => setActiveTab('advice')}
        >
          💡 Консультации
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'tracker' && (
          <DailyFoodTracker token={token} />
        )}
        
        {activeTab === 'history' && (
          <FoodHistory token={token} onSelectDate={handleDateSelect} />
        )}
        
        {activeTab === 'advice' && (
          <NutritionAdvicePanel token={token} />
        )}
      </div>
    </div>
  );
}
