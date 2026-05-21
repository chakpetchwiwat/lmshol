import React from 'react';
import RewardCard from '../common/RewardCard';

const RewardsCatalog = ({ rewards, points, onRedeem, redeeming }) => {
  return (
    <section>
      <div className="flex justify-between items-center mb-4 px-1">
        <h3 className="text-xl font-bold tracking-tight text-gray-900">ของรางวัลสุดพิเศษ</h3>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 md:gap-6">
        {rewards.map(reward => (
          <RewardCard 
            key={reward.id} 
            reward={reward} 
            points={points} 
            onRedeem={onRedeem}
            redeeming={redeeming}
          />
        ))}
        {rewards.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-200 py-12 text-center text-slate-500">
            <p className="font-medium">ยังไม่มีของรางวัลในขณะนี้</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default RewardsCatalog;
