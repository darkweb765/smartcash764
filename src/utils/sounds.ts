// Create and play a success sound using Web Audio API
export const playSuccessSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create oscillator for the first tone
    const oscillator1 = audioContext.createOscillator();
    const gainNode1 = audioContext.createGain();
    
    oscillator1.connect(gainNode1);
    gainNode1.connect(audioContext.destination);
    
    oscillator1.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
    oscillator1.type = "sine";
    
    gainNode1.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode1.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator1.start(audioContext.currentTime);
    oscillator1.stop(audioContext.currentTime + 0.3);
    
    // Create oscillator for the second tone
    const oscillator2 = audioContext.createOscillator();
    const gainNode2 = audioContext.createGain();
    
    oscillator2.connect(gainNode2);
    gainNode2.connect(audioContext.destination);
    
    oscillator2.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.15); // E5
    oscillator2.type = "sine";
    
    gainNode2.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode2.gain.setValueAtTime(0.3, audioContext.currentTime + 0.15);
    gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.45);
    
    oscillator2.start(audioContext.currentTime + 0.15);
    oscillator2.stop(audioContext.currentTime + 0.45);
    
    // Create oscillator for the third tone
    const oscillator3 = audioContext.createOscillator();
    const gainNode3 = audioContext.createGain();
    
    oscillator3.connect(gainNode3);
    gainNode3.connect(audioContext.destination);
    
    oscillator3.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.3); // G5
    oscillator3.type = "sine";
    
    gainNode3.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode3.gain.setValueAtTime(0.3, audioContext.currentTime + 0.3);
    gainNode3.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.6);
    
    oscillator3.start(audioContext.currentTime + 0.3);
    oscillator3.stop(audioContext.currentTime + 0.6);
    
  } catch (error) {
    console.log("Could not play success sound:", error);
  }
};
