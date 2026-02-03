import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "smartcash_balance";
const CLAIMED_KEY = "smartcash_gift_claimed";
const TARGET_BALANCE = 150000;

export const useGiftClaim = () => {
  const [balance, setBalance] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? parseFloat(saved) : 0;
  });

  const [isClaimed, setIsClaimed] = useState<boolean>(() => {
    return localStorage.getItem(CLAIMED_KEY) === "true";
  });

  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, balance.toString());
  }, [balance]);

  useEffect(() => {
    localStorage.setItem(CLAIMED_KEY, isClaimed.toString());
  }, [isClaimed]);

  const claimGift = useCallback(() => {
    if (isClaimed || isAnimating) return;

    setIsAnimating(true);
    
    const duration = 2500; // 2.5 seconds
    const steps = 60;
    const increment = TARGET_BALANCE / steps;
    const intervalTime = duration / steps;
    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep++;
      const newBalance = Math.min(Math.round(increment * currentStep), TARGET_BALANCE);
      setBalance(newBalance);

      if (currentStep >= steps) {
        clearInterval(interval);
        setBalance(TARGET_BALANCE);
        setIsClaimed(true);
        setIsAnimating(false);
      }
    }, intervalTime);
  }, [isClaimed, isAnimating]);

  return {
    balance,
    isClaimed,
    isAnimating,
    claimGift,
  };
};
