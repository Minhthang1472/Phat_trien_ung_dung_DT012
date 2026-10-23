import React from 'react';
import LottieView from 'lottie-react-native';

/**
 * Native (Android / iOS / APK) Implementation of LottieAnimation using lottie-react-native
 */
export default function LottieAnimation({
  source,
  style,
  autoPlay = true,
  loop = true,
}) {
  return (
    <LottieView
      source={source}
      style={style}
      autoPlay={autoPlay}
      loop={loop}
    />
  );
}
