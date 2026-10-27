import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import lottie from 'lottie-web';

/**
 * Web Implementation of LottieAnimation using lottie-web (SVG Vector)
 */
export default function LottieAnimation({
  source,
  style,
  autoPlay = true,
  loop = true,
}) {
  const containerRef = useRef(null);
  const animInstanceRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      if (animInstanceRef.current) {
        animInstanceRef.current.destroy();
      }

      try {
        animInstanceRef.current = lottie.loadAnimation({
          container: containerRef.current,
          renderer: 'svg',
          loop: loop,
          autoplay: autoPlay,
          animationData: source,
        });
      } catch (err) {
        console.warn('Lottie web load error:', err);
      }
    }

    return () => {
      if (animInstanceRef.current) {
        animInstanceRef.current.destroy();
        animInstanceRef.current = null;
      }
    };
  }, [source, loop, autoPlay]);

  const flattened = StyleSheet.flatten(style) || {};
  const width = flattened.width || 120;
  const height = flattened.height || 120;

  return (
    <View style={[styles.center, { width, height }]}>
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
