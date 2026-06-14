import React from 'react';
import { StyleSheet, View, Pressable, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../theme/ThemeContext';
import Animated, { 
  useAnimatedStyle, 
  withSpring, 
  useSharedValue, 
  interpolateColor,
  interpolate,
  withTiming
} from 'react-native-reanimated';

const AnimatedBlur = Animated.createAnimatedComponent(BlurView);

// iOS 26 "Liquid Glass" Element
const LiquidElement = ({ 
  children, 
  style, 
  onPress, 
  intensity = 40,
  shape = 'rect',
  cornerRadius = 28
}) => {
  const { colors, theme } = useTheme();
  const scale = useSharedValue(1);
  const pressed = useSharedValue(0);
  const tilt = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { perspective: 1000 },
      { rotateY: `${tilt.value * 5}deg` }
    ],
  }));

  const containerStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      pressed.value,
      [0, 1],
      [colors.glass, colors.glassProminent]
    ),
    borderColor: interpolateColor(
      pressed.value,
      [0, 1],
      ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.2)']
    ),
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 200 });
    pressed.value = withSpring(1);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 200 });
    pressed.value = withSpring(0);
  };

  const borderRadius = shape === 'circle' ? 100 : cornerRadius;

  return (
    <Animated.View style={[styles.wrapper, animatedStyle, style]}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        style={({ pressed }) => [
          styles.pressable, 
          { borderRadius }
        ]}
      >
        <AnimatedBlur 
          intensity={intensity} 
          tint={theme === 'dark' ? 'dark' : 'light'}
          style={[
            styles.blur, 
            containerStyle,
            { borderRadius }
          ]}
        >
          <View style={[styles.content]}>
            {children}
          </View>
        </AnimatedBlur>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    // Liquid Refractive Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  pressable: {
    overflow: 'hidden',
  },
  blur: {
    borderWidth: 1.5,
  },
  content: {
    // Liquid elements use dynamic padding
  },
});

export default LiquidElement;