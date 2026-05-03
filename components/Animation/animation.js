import React, { useEffect, useRef } from 'react';
import { Animated, Easing, TouchableOpacity, Text, View, TextInput } from 'react-native';

// Animated Section Component
export const AnimatedSection = ({ children, delay = 0, style }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};

// Animated Button Component
export const AnimatedButton = ({ onPress, children, style, textStyle, disabled = false }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (!disabled) {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0.96,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.8,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  const handlePressOut = () => {
    if (!disabled) {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      activeOpacity={1}
    >
      <Animated.View
        style={[
          style,
          {
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        {typeof children === 'string' ? (
          <Text style={textStyle}>{children}</Text>
        ) : (
          children
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

// Animated Input Component
export const AnimatedInput = ({ style, error, onFocus, onBlur, ...props }) => {
  const borderColorAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = (e) => {
    Animated.timing(borderColorAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
    onFocus && onFocus(e);
  };

  const handleBlur = (e) => {
    Animated.timing(borderColorAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
    onBlur && onBlur(e);
  };

  const borderColor = borderColorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: error ? ['#ef4444', '#ef4444'] : ['#e2e8f0', '#3b82f6'],
  });

  const backgroundColor = borderColorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#f8fafc', '#ffffff'],
  });

  const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

  return (
    <AnimatedTextInput
      {...props}
      style={[
        style,
        {
          borderColor,
          backgroundColor,
        },
      ]}
      onFocus={handleFocus}
      onBlur={handleBlur}
    />
  );
};

// Loading Pulse Component
export const LoadingPulse = ({ style }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = () => {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(() => pulse());
    };
    pulse();
  }, []);

  return (
    <Animated.View
      style={[
        style,
        {
          transform: [{ scale: pulseAnim }],
        },
      ]}
    />
  );
};

// Success Animation Component
export const SuccessAnimation = ({ visible, onComplete }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const checkmarkAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 300,
            easing: Easing.out(Easing.back(1.7)),
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(checkmarkAnim, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(() => {
        setTimeout(() => {
          onComplete && onComplete();
        }, 1000);
      });
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      zIndex: 1000,
    }}>
      <Animated.View
        style={{
          width: 100,
          height: 100,
          borderRadius: 50,
          backgroundColor: '#059669',
          justifyContent: 'center',
          alignItems: 'center',
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        }}
      >
        <Animated.Text
          style={{
            fontSize: 40,
            color: 'white',
            opacity: checkmarkAnim,
            transform: [{ scale: checkmarkAnim }],
          }}
        >
          ✓
        </Animated.Text>
      </Animated.View>
      <Animated.Text
        style={{
          marginTop: 20,
          fontSize: 18,
          color: 'white',
          fontWeight: '600',
          opacity: checkmarkAnim,
        }}
      >
        Order Submitted Successfully!
      </Animated.Text>
    </View>
  );
};

// Slide Modal Component
export const SlideModal = ({ visible, onClose, children }) => {
  const slideAnim = useRef(new Animated.Value(300)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 300,
          duration: 250,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'flex-end',
        opacity: opacityAnim,
      }}
    >
      <TouchableOpacity
        style={{ flex: 1 }}
        onPress={onClose}
        activeOpacity={1}
      />
      <Animated.View
        style={{
          backgroundColor: 'white',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          padding: 20,
          maxHeight: '80%',
          transform: [{ translateY: slideAnim }],
        }}
      >
        {children}
      </Animated.View>
    </Animated.View>
  );
};

// Progress Bar Component
export const ProgressBar = ({ progress, style }) => {
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 500,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const width = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View
      style={[
        {
          height: 4,
          backgroundColor: '#e2e8f0',
          borderRadius: 2,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View
        style={{
          height: '100%',
          backgroundColor: '#3b82f6',
          width,
        }}
      />
    </View>
  );
};

// Stagger Animation Hook
export const useStaggerAnimation = (items, delay = 100) => {
  const animations = useRef(
    items.map(() => new Animated.Value(0))
  ).current;

  useEffect(() => {
    const animationSequence = animations.map((anim, index) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 300,
        delay: index * delay,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      })
    );

    Animated.stagger(delay, animationSequence).start();
  }, [items.length]);

  return animations;
};

// Shake Animation Hook
export const useShakeAnimation = () => {
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return {
    shake,
    shakeStyle: {
      transform: [{ translateX: shakeAnim }],
    },
  };
};