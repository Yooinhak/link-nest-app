import { useEffect, useState } from 'react';

import { AccessibilityInfo } from 'react-native';

/**
 * OS '동작 줄이기(Reduce Motion)' 설정 구독.
 * 스켈레톤 시머·페이드 등 장식성 애니메이션을 접근성 설정에 맞춰 억제하는 데 쓴다
 * (quick-reference §1 `reduced-motion`).
 */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (mounted) setReduce(v);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  return reduce;
}
