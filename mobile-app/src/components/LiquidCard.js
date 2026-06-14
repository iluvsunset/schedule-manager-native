import React from 'react';
import { StyleSheet, View, Pressable, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../theme/ThemeContext';
import Animated, { 
  useAnimatedStyle, 
  withSpring, 
  useSharedValue, 
  interpolateColor 
} from 'react-native-reanimated';

const AnimatedBlur = Animated.createAnimatedComponent(BlurView);

const LiquidCard = ({ children, style, onPress, type = 'regular' }) => {
  const { colors, theme } = useTheme();
  const scale = useSharedValue(1);
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: 1, // Liquid cards stay opaque but morph
  }));

  const containerStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      pressed.value,
      [0, 1],
      [colors.glass, colors.glassProminent]
    ),
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15 });
    pressed.value = withSpring(1);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
    pressed.value = withSpring(0);
  };

  return (
    <Animated.View style={[styles.wrapper, animatedStyle, style]}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        style={({ pressed }) => [styles.pressable]}
      >
        <AnimatedBlur 
          intensity={Platform.OS === 'ios' ? 40 : 100} 
          tint={theme === 'dark' ? 'dark' : 'light'}
          style={[styles.blur, containerStyle]}
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
    marginVertical: 10,
    borderRadius: 28,
    // iOS Liquid Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  pressable: {
    borderRadius: 28,
    overflow: 'hidden',
  },
  blur: {
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  content: {
    padding: 24,
  },
});

export default LiquidCard;
