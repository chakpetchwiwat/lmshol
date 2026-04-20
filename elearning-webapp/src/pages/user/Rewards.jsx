import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { userAPI } from '../../utils/api';
import { useToast } from '../../context/useToast';
import useConfirm from '../../hooks/useConfirm';
import ConfirmDialog from '../../components/common/ConfirmDialog';

// Sub-components
import PointsCard from '../../components/user/PointsCard';
import RewardsCatalog from '../../components/user/RewardsCatalog';
import PointsHistoryList from '../../components/user/PointsHistoryList';

const Rewards = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { confirm, ConfirmDialogProps } = useConfirm();
  
  const [points, setPoints] = useState(0);
  const [history, setHistory] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [pointsRes, rewardsRes] = await Promise.allSettled([
        userAPI.getPoints(),
        userAPI.getRewards()
      ]);
      
      if (pointsRes.status === 'fulfilled') {
        const pData = pointsRes.value?.data || pointsRes.value;
        setPoints(pData?.balance || 0);
        setHistory(Array.isArray(pData?.history) ? pData.history : []);
      }
      
      if (rewardsRes.status === 'fulfilled') {
        const rData = rewardsRes.value?.data || rewardsRes.value;
        setRewards(Array.isArray(rData) ? rData : []);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('ไม่สามารถโหลดข้อมูลพอยท์ได้');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRedeem = async (rewardId, cost, max, userRedeemed) => {
    if (points < cost) {
      toast.warning('แต้มไม่เพียงพอสำหรับการแลกรางวัลนี้');
      return;
    }
    
    if (userRedeemed >= max) {
      toast.warning('คุณใช้สิทธิ์ในการแลกรางวัลนี้ครบถ้วนแล้ว');
      return;
    }
    
    const ok = await confirm({
      title: 'ยืนยันการแลกของรางวัล',
      message: `ยืนยันการแลกของรางวัล? จะใช้แต้ม ${cost} แต้ม`,
      confirmLabel: 'แลกรางวัล',
      variant: 'primary',
    });
    if (!ok) return;

    try {
      setRedeeming(true);
      await userAPI.requestRedeem(rewardId);
      toast.success('ส่งคำร้องขอแลกของรางวัลสำเร็จ โปรดรอแอดมินอนุมัติ');
      fetchData();
    } catch (error) {
      console.error('Redeem error:', error);
      toast.error(error.response?.data?.message || 'การแลกรางวัลล้มเหลว');
    } finally {
      setRedeeming(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 animate-fade-in pb-8 pt-2">
      <PointsCard 
        points={points}
        onNavigate={navigate}
      />

      <RewardsCatalog 
        rewards={rewards}
        points={points}
        onRedeem={handleRedeem}
        redeeming={redeeming}
      />

      <PointsHistoryList 
        history={history}
      />
      <ConfirmDialog {...ConfirmDialogProps} />
    </div>
  );
};

export default Rewards;
