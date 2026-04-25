import { useRef, useCallback } from 'react';
import { NativeSyntheticEvent, NativeScrollEvent, DeviceEventEmitter } from 'react-native';

/**
 * Hook to handle scroll-to-hide behavior for the bottom tab bar.
 * Emits 'setTabBarVisible' events that are consumed by the TabLayout.
 */
export const useScrollToHide = () => {
    const lastOffset = useRef(0);
    const lastVisible = useRef(true);

    const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const currentOffset = event.nativeEvent.contentOffset.y;
        
        // Ignore bounces at the top or bottom
        if (currentOffset < 0) return;
        
        const diff = currentOffset - lastOffset.current;

        // Threshold to avoid flickering on micro-movements
        if (Math.abs(diff) > 10) {
            if (diff > 0 && currentOffset > 80) {
                // Scrolling down - hide
                if (lastVisible.current) {
                    DeviceEventEmitter.emit('setTabBarVisible', false);
                    lastVisible.current = false;
                }
            } else if (diff < -15) {
                // Scrolling up - show
                if (!lastVisible.current) {
                    DeviceEventEmitter.emit('setTabBarVisible', true);
                    lastVisible.current = true;
                }
            }
        }
        lastOffset.current = currentOffset;
    }, []);

    const reset = useCallback(() => {
        DeviceEventEmitter.emit('setTabBarVisible', true);
        lastVisible.current = true;
        lastOffset.current = 0;
    }, []);

    return { onScroll, reset };
};
