import React, { createContext, useContext, useEffect } from 'react';
import { StyleSheet, View, Dimensions, Platform } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring, 
  withRepeat, 
  withSequence, 
  withTiming,
  Easing
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');
const GlassContext = createContext({});

export const GlassEffectContainer = ({ children, style, spacing = 20 }) => {
  return (
    <GlassContext.Provider value={{ spacing }}>
      <View style={[styles.mainContainer, style]}>
        {/* Background Ambient Blobs for Liquid Reflection (Refractive Highlights) */}
        <RefractiveHighlight color="rgba(10, 132, 255, 0.25)" x={-100} y={150} size={400} />
        <RefractiveHighlight color="rgba(255, 159, 10, 0.2)" x={width - 200} y={height / 2} size={350} />
        <RefractiveHighlight color="rgba(191, 90, 242, 0.15)" x={width / 4} y={height - 300} size={500} />
        {children}
      </View>
    </GlassContext.Provider>
  );
};

const RefractiveHighlight = ({ color, x, y, size }) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    scale.value = withRepeat(
      withTiming(1.3, { duration: 8000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    opacity.value = withRepeat(
      withTiming(0.7, { duration: 6000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View 
      style={[
        styles.blob, 
        { 
          backgroundColor: color, 
          left: x, 
          top: y, 
          width: size, 
          height: size, 
          borderRadius: size / 2 
        }, 
        style
      ]} 
    />
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  blob: {
    position: 'absolute',
    // iOS 26 Liquid Blur Spec: Deep Gaussian Blur
    shadowOpacity: 0.1,
    shadowRadius: 100,
    elevation: 0,
    // Using platform-specific blur simulation
    ...(Platform.OS === 'ios' ? { filter: 'blur(80px)' } : { opacity: 0.3 }),
  },
});

export const useGlass = () => useContext(GlassContext);