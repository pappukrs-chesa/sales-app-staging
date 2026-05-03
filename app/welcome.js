import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  Animated,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

const { width, height } = Dimensions.get('window');

const welcomeData = [
  {
    id: 1,
    title: "Welcome to\nChesa Dental Care",
    subtitle: "Your Professional E-Sales Platform",
    description: "Streamline your dental equipment sales with our comprehensive mobile solution designed for sales professionals.",
    image: "https://chesadentalcare.com/assets/img/logo.png",
    backgroundColor: '#0f172a',
    accentColor: '#3b82f6',
  },
  {
    id: 2,
    title: "Premium\nDental Equipment",
    subtitle: "Showcase Quality Products",
    description: "Present our full range of professional dental chairs, equipment, and accessories with detailed specifications and pricing.",
    image: "https://chesadentalcare.com/assets/img/product/chairs/dental%20chairs/O2c.png",
    backgroundColor: '#1e293b',
    accentColor: '#06b6d4',
  },
  {
    id: 3,
    title: "Boost Your\nSales Performance",
    subtitle: "Professional Tools at Your Fingertips",
    description: "Access customer data, generate quotes, track orders, and close deals faster with our intelligent mobile platform.",
    image: "https://chesadentalcare.com/assets/img/logo.png",
    backgroundColor: '#0c4a6e',
    accentColor: '#10b981',
  },
];

const WelcomeScreen = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleNext = () => {
    if (currentIndex < welcomeData.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      scrollViewRef.current?.scrollTo({
        x: nextIndex * width,
        animated: true,
      });
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      scrollViewRef.current?.scrollTo({
        x: prevIndex * width,
        animated: true,
      });
    }
  };

  const handleGetStarted = async () => {
    try {
      await AsyncStorage.setItem('hasSeenWelcome', 'true');
      
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        router.replace('/auth');
      });
    } catch (error) {
      console.error('Error saving welcome status:', error);
      router.replace('/auth');
    }
  };

  const handleScroll = (event) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / width);
    setCurrentIndex(index);
  };

  const currentSlide = welcomeData[currentIndex];

  return (
    <Animated.View 
      style={[
        styles.container, 
        { 
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }, { scale: scaleAnim }]
        }
      ]}
    >
      <StatusBar barStyle="light-content" backgroundColor={currentSlide.backgroundColor} />
      
      {/* Dynamic Background */}
      <LinearGradient
        colors={[currentSlide.backgroundColor, currentSlide.backgroundColor + 'dd', currentSlide.backgroundColor + 'aa']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Decorative Elements */}
      <View style={styles.decorativeCircle1} />
      <View style={styles.decorativeCircle2} />
      <View style={styles.decorativeCircle3} />

      {/* Skip Button */}
      <TouchableOpacity style={styles.skipButton} onPress={handleGetStarted}>
        <Text style={styles.skipButtonText}>Skip</Text>
      </TouchableOpacity>

      {/* Content Slider */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {welcomeData.map((item, index) => (
          <View key={item.id} style={styles.slide}>
            {/* Image Section */}
            <View style={styles.imageSection}>
              <View style={[styles.imageContainer, { backgroundColor: item.accentColor + '20' }]}>
                <Image
                  source={{ uri: item.image }}
                  style={[
                    styles.slideImage,
                    item.id === 2 && styles.chairImage
                  ]}
                  resizeMode="contain"
                />
              </View>
            </View>
            
            {/* Text Section */}
            <View style={styles.textSection}>
              <View style={styles.textContainer}>
                <Text style={styles.title}>{item.title}</Text>
                <View style={[styles.accentLine, { backgroundColor: item.accentColor }]} />
                <Text style={[styles.subtitle, { color: item.accentColor }]}>{item.subtitle}</Text>
                <Text style={styles.description}>{item.description}</Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Modern Dots Indicator */}
      <View style={styles.dotsContainer}>
        {welcomeData.map((_, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.dot,
              index === currentIndex && [styles.activeDot, { backgroundColor: currentSlide.accentColor }],
            ]}
            onPress={() => {
              setCurrentIndex(index);
              scrollViewRef.current?.scrollTo({
                x: index * width,
                animated: true,
              });
            }}
          />
        ))}
      </View>

      {/* Premium Bottom Navigation */}
      <View style={styles.bottomContainer}>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.navButton, styles.previousButton]}
            onPress={handlePrevious}
            disabled={currentIndex === 0}
          >
            <Text style={[styles.navButtonText, currentIndex === 0 && styles.disabledText]}>
              ← Back
            </Text>
          </TouchableOpacity>
          
          {currentIndex < welcomeData.length - 1 ? (
            <TouchableOpacity
              style={[styles.navButton, styles.nextButton, { borderColor: currentSlide.accentColor }]}
              onPress={handleNext}
            >
              <Text style={[styles.navButtonText, { color: currentSlide.accentColor }]}>
                Next →
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.getStartedButton}
              onPress={handleGetStarted}
            >
              <LinearGradient
                colors={[currentSlide.accentColor, currentSlide.accentColor + 'dd']}
                style={styles.getStartedGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.getStartedButtonText}>Get Started</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Animated.View>
  );
};

export default WelcomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -150,
    left: -150,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  decorativeCircle3: {
    position: 'absolute',
    top: height * 0.3,
    right: -50,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  skipButtonText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
    marginTop: 80,
  },
  slide: {
    width: width,
    flex: 1,
    paddingHorizontal: 20,
  },
  imageSection: {
    flex: 0.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  imageContainer: {
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 20,
  },
  slideImage: {
    width: width * 0.5,
    height: width * 0.5,
  },
  chairImage: {
    width: width * 0.6,
    height: width * 0.6,
  },
  textSection: {
    flex: 0.5,
    justifyContent: 'flex-start',
  },
  textContainer: {
    alignItems: 'flex-start',
    paddingHorizontal: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
    lineHeight: 38,
    marginBottom: 15,
    letterSpacing: -0.5,
  },
  accentLine: {
    width: 60,
    height: 4,
    borderRadius: 2,
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 26,
    letterSpacing: 0.2,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 30,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 6,
    transform: [{ scale: 0.8 }],
  },
  activeDot: {
    width: 30,
    transform: [{ scale: 1 }],
  },
  bottomContainer: {
    paddingHorizontal: 20,
    paddingBottom: 50,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navButton: {
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 25,
    minWidth: 100,
    alignItems: 'center',
  },
  previousButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  nextButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  disabledText: {
    color: 'rgba(255, 255, 255, 0.4)',
  },
  getStartedButton: {
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  getStartedGradient: {
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 25,
    alignItems: 'center',
    minWidth: 140,
  },
  getStartedButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});