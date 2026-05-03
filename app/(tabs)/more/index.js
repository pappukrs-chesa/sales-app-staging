import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Image, 
  Alert,
  StatusBar,
  Platform,
  Dimensions,
  Linking, 
  Animated,
  Easing,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

const TOKEN_KEY = "CHESA_AUTH_TOKEN";
import { useLogout } from '../../auth/logoutButton';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const menuItems = [
  { 
    iconName: 'call', 
    label: 'Technical Support', 
    description: 'Get technical assistance',
    color: '#2563eb',
    bgColor: '#f8fafc',
    route: 'technical-support'
  },
  { 
    iconName: 'log-out', 
    label: 'Logout', 
    description: 'Sign out of your account',
    color: '#dc2626',
    bgColor: '#f8fafc',
    route: 'logout'
  }
];

const MoreTab = () => {
  const { performLogout } = useLogout();
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const profileCardAnim = useRef(new Animated.Value(0)).current;
  const menuItemsAnim = useRef([]).current;
  
  // State for user data
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    phone: '',
    profileImage: null,
    role: '',
    employeeID: '',
    sales_person: '',
    coordinator: ''
  });
  
  const [loading, setLoading] = useState(true);
  const [imageUploading, setImageUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Initialize menu item animations
  useEffect(() => {
    menuItems.forEach((_, index) => {
      if (!menuItemsAnim[index]) {
        menuItemsAnim[index] = new Animated.Value(0);
      }
    });
  }, []);

  // Fetch user data from AsyncStorage
  useEffect(() => {
    fetchUserData();
  }, []);

  const animateContent = () => {
    // Reset all animations
    fadeAnim.setValue(0);
    slideAnim.setValue(50);
    scaleAnim.setValue(0.95);
    profileCardAnim.setValue(0);
    menuItemsAnim.forEach(anim => anim.setValue(0));

    // Sequence of animations
    Animated.sequence([
      // Initial fade and slide
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        })
      ]),
      
      // Profile card animation
      Animated.timing(profileCardAnim, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      
      // Staggered menu items animation
      Animated.stagger(100, 
        menuItemsAnim.map(anim => 
          Animated.timing(anim, {
            toValue: 1,
            duration: 400,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          })
        )
      )
    ]).start();
  };

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const keys = ['user', 'role', 'employeeID', 'sales_person', 'coordinator'];
      const values = await AsyncStorage.multiGet(keys);
      
      const userDataFromStorage = {};
      values.forEach(([key, value]) => {
        if (value !== null) {
          userDataFromStorage[key] = key === 'user' ? JSON.parse(value) : value;
        }
      });

      // Extract user information
      const user = userDataFromStorage.user || {};
      const userName = user.sales_person?.toUpperCase() || user.firstName || 'User Name';
      
      setUserData({
        name: userName,
        email: user.email || 'user@example.com',
        phone: user.phone || '+91 XXXXXXXXXX',
        profileImage: user.profileImage || user.avatar || null,
        role: userDataFromStorage.role || user.subrole || 'Employee',
        employeeID: user.id || 'N/A',
        sales_person: userDataFromStorage.sales_person || user.sales_person || '',
        coordinator: userDataFromStorage.coordinator || user.coordinator || ''
      });
      
      setLoading(false);
      
      // Animate content after data is loaded
      setTimeout(() => {
        animateContent();
      }, 100);
      
    } catch (error) {
      console.error('Error fetching user data:', error);
      setLoading(false);
      Alert.alert('Error', 'Failed to load user data. Please try again.');
    }
  };

  const handleImagePicker = async () => {
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    Alert.alert(
      'Update Profile Picture',
      'Choose how you want to update your profile picture',
      [
        { 
          text: 'Camera', 
          onPress: () => openImagePicker('camera'),
          style: 'default'
        },
        { 
          text: 'Gallery', 
          onPress: () => openImagePicker('gallery'),
          style: 'default'
        },
        { 
          text: 'Cancel', 
          style: 'cancel' 
        }
      ],
      { cancelable: true }
    );
  };

  const openImagePicker = async (type) => {
    let result;
    
    try {
      if (type === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permission Required', 'Camera access is required to take photos.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permission Required', 'Gallery access is required to select photos.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUploading(true);
        
        // Simulate upload delay
        setTimeout(async () => {
          try {
            const imageUri = result.assets[0].uri;
            
            // Update local state
            setUserData(prev => ({ ...prev, profileImage: imageUri }));
            
            // Save to AsyncStorage
            const user = await AsyncStorage.getItem('user');
            if (user) {
              const userData = JSON.parse(user);
              userData.profileImage = imageUri;
              await AsyncStorage.setItem('user', JSON.stringify(userData));
            }
            
            setImageUploading(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            
            // Success animation
            Animated.sequence([
              Animated.timing(scaleAnim, {
                toValue: 1.05,
                duration: 150,
                useNativeDriver: true,
              }),
              Animated.timing(scaleAnim, {
                toValue: 1,
                duration: 150,
                useNativeDriver: true,
              })
            ]).start();
            
          } catch (error) {
            setImageUploading(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Error', 'Failed to update profile picture. Please try again.');
          }
        }, 1500);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to access camera or gallery.');
    }
  };

  const handleCustomLogout = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to sign out of your account?',
      [
        { 
          text: 'Cancel', 
          style: 'cancel',
          onPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              const result = await performLogout();
              if (result.success) {
                // console.log('Logout successful');
              } else {
                // console.log('Logout failed:', result.error);
                Alert.alert('Error', 'Failed to logout. Please try again.');
              }
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'An error occurred during logout.');
            }
          }
        }
      ]
    );
  };

const handleTechnicalSupport = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

  const phoneNumber = 'tel:6366050584'; // Replace with your support number
  Linking.openURL(phoneNumber).catch(err =>
    console.error('Failed to open dialer', err)
  );
};

  const handleNavigation = (item) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (item.route === 'logout') {
      handleCustomLogout();
      return;
    }

    if (item.route === 'technical-support') {
      handleTechnicalSupport();
      return;
    }
    
    // console.log("Navigating to:", `/${item.route}`);
    // router.navigate(`/${item.route}`);
  };

  const handleEditProfile = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.navigate('/edit-profile');
  };

  const handleRefresh = () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    setTimeout(() => {
      fetchUserData();
      setRefreshing(false);
    }, 1000);
  };

  // Function to get initials from name
  const getInitials = (name) => {
    if (!name || name.trim() === '') return 'U';
    const names = name.trim().split(' ');
    if (names.length === 1) {
      return names[0].charAt(0).toUpperCase();
    }
    return `${names[0].charAt(0)}${names[names.length - 1].charAt(0)}`.toUpperCase();
  };

  // Function to generate gradient colors based on name
  const getAvatarGradient = (name) => {
    if (!name) return ['#3b82f6', '#1d4ed8'];
    
    const gradients = [
      ['#3b82f6', '#1d4ed8'], // Blue
      ['#8b5cf6', '#7c3aed'], // Purple
      ['#10b981', '#059669'], // Green
      ['#f59e0b', '#d97706'], // Yellow
      ['#ef4444', '#dc2626'], // Red
      ['#06b6d4', '#0891b2'], // Cyan
      ['#84cc16', '#65a30d'], // Lime
      ['#f97316', '#ea580c'], // Orange
      ['#ec4899', '#db2777'], // Pink
      ['#6366f1', '#4f46e5'], // Indigo
    ];
    
    const charCode = name.charCodeAt(0) || 0;
    return gradients[charCode % gradients.length];
  };

  // Enhanced Avatar Component
  const EnhancedAvatar = ({ name, imageUrl, style, onPress }) => {
    const [imageError, setImageError] = useState(false);
    const [imageLoading, setImageLoading] = useState(true);
    const gradient = getAvatarGradient(name);
    
    return (
      <TouchableOpacity 
        onPress={onPress} 
        style={styles.avatarContainer}
        activeOpacity={0.8}
      >
        <Animated.View 
          style={[
            style, 
            styles.avatarWrapper,
            {
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          {imageUrl && !imageError ? (
            <>
              <Image
                source={{ uri: imageUrl }}
                style={[style, styles.avatarImage]}
                onError={() => {
                  setImageError(true);
                  setImageLoading(false);
                }}
                onLoad={() => setImageLoading(false)}
              />
              {imageLoading && (
                <View style={styles.imageLoadingOverlay}>
                  <ActivityIndicator size="small" color="#ffffff" />
                </View>
              )}
            </>
          ) : (
            <LinearGradient
              colors={gradient}
              style={[style, styles.avatarGradient]}
            >
              <Text style={styles.avatarInitials}>
                {getInitials(name)}
              </Text>
            </LinearGradient>
          )}
          
          <View style={styles.cameraIconContainer}>
            <Ionicons name="camera" size={16} color="#ffffff" />
          </View>
        </Animated.View>
        
        {imageUploading && (
          <View style={styles.uploadingOverlay}>
            <ActivityIndicator size="small" color="#ffffff" />
            <Text style={styles.uploadingText}>Uploading...</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Enhanced Menu Item Component
  const EnhancedMenuItem = ({ item, index, onPress }) => {
    const [pressed, setPressed] = useState(false);
    
    return (
      <Animated.View
        style={[
          styles.menuItemWrapper,
          {
            opacity: menuItemsAnim[index] || 1,
            transform: [
              {
                translateY: menuItemsAnim[index] ? menuItemsAnim[index].interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0]
                }) : 0
              },
              {
                scale: pressed ? 0.98 : 1
              }
            ]
          }
        ]}
      >
        <TouchableOpacity 
          style={[styles.menuItem, { backgroundColor: item.bgColor }]}
          onPress={() => onPress(item)}
          activeOpacity={1}
          onPressIn={() => setPressed(true)}
          onPressOut={() => setPressed(false)}
        >
          <View style={[styles.menuIconContainer, { backgroundColor: item.color }]}>
            <Ionicons name={item.iconName} size={22} color="#ffffff" />
          </View>
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Text style={styles.menuDescription}>{item.description}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading Profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f1f5f9" />
      
      {/* Enhanced Header */}
      <LinearGradient
        colors={['#f8fafc', '#f1f5f9']}
        style={styles.headerGradient}
      >
        <Animated.View 
          style={[
            styles.headerContent,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={styles.headerTitle}>My Profile</Text>
          <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
            <Ionicons 
              name="refresh" 
              size={20} 
              color="#6b7280" 
              style={{ 
                transform: [{ rotate: refreshing ? '360deg' : '0deg' }] 
              }} 
            />
          </TouchableOpacity>
        </Animated.View>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Enhanced Profile Card */}
        <Animated.View 
          style={[
            styles.profileCard,
            {
              opacity: profileCardAnim,
              transform: [
                { 
                  translateY: profileCardAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0]
                  })
                },
                { scale: profileCardAnim }
              ]
            }
          ]}
        >
          <View style={styles.profileHeader}>
            <EnhancedAvatar 
              name={userData.name}
              imageUrl={userData.profileImage}
              style={styles.profileAvatar}
              onPress={handleImagePicker}
            />
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{userData.name}</Text>
              <Text style={styles.profileEmail}>{userData.email}</Text>
              <Text style={styles.profilePhone}>{userData.phone}</Text>
              
              <View style={styles.badgeContainer}>
                {userData.role && (
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleBadgeText}>{userData.role}</Text>
                  </View>
                )}
                {userData.employeeID && userData.employeeID !== 'N/A' && (
                  <View style={styles.employeeBadge}>
                    <Text style={styles.employeeBadgeText}>ID: {userData.employeeID}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* <TouchableOpacity 
            style={styles.editButton} 
            onPress={handleEditProfile}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#3b82f6', '#1d4ed8']}
              style={styles.editButtonGradient}
            >
              <Ionicons name="create-outline" size={18} color="#ffffff" />
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </LinearGradient>
          </TouchableOpacity> */}
        </Animated.View>

        {/* Enhanced Menu Items */}
        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => (
            <EnhancedMenuItem
              key={index}
              item={item}
              index={index}
              onPress={handleNavigation}
            />
          ))}
        </View>

        {/* App Info */}
        <Animated.View 
          style={[
            styles.versionContainer,
            {
              opacity: fadeAnim,
            }
          ]}
        >
          <Text style={styles.versionText}>Version 1.2.1</Text>
          <Text style={styles.companyText}>© 2025 CHESA DENTAL CARE SERVICES LTD</Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  
  loadingText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '600',
    marginTop: 16,
  },
  
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 15,
    paddingHorizontal: 24,
  },
  
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  
  headerTitle: {
    fontSize: 25,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.8,
  },
  
  refreshButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  
  scrollView: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  
  scrollContent: {
    paddingBottom: 40,
  },
  
  profileCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 24,
    padding: 10,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 28,
  },
  
  avatarContainer: {
    position: 'relative',
    marginRight: 20,
  },
  
  avatarWrapper: {
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  
  profileAvatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 4,
    borderColor: '#ffffff',
  },
  
  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  
  avatarGradient: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#ffffff',
  },
  
  avatarInitials: {
    fontSize: 36,
    fontWeight: '800',
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  
  cameraIconContainer: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    backgroundColor: '#1f2937',
    borderRadius: 18,
    padding: 10,
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  
  imageLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  
  uploadingText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  
  profileInfo: {
    flex: 1,
    paddingTop: 4,
  },
  
  profileName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
    letterSpacing: -0.6,
  },
  
  profileEmail: {
    fontSize: 15,
    color: '#6b7280',
    marginBottom: 4,
    fontWeight: '500',
  },
  
  profilePhone: {
    fontSize: 15,
    color: '#6b7280',
    marginBottom: 16,
    fontWeight: '500',
  },
  
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  
  roleBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  
  roleBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e40af',
  },
  
  employeeBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  
  employeeBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#047857',
  },
  
  editButton: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#3b82f6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  
  editButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 28,
    gap: 12,
  },
  
  editButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  
  menuContainer: {
    marginHorizontal: 20,
    marginTop: 28,
    gap: 18,
  },
  
  menuItemWrapper: {
    borderRadius: 20,
    backgroundColor: '#ffffff',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 22,
    borderRadius: 20,
    minHeight: 65,
  },
  
  menuIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  
  menuTextContainer: {
    flex: 1,
    paddingRight: 16,
  },
  
  menuLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  
  menuDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    fontWeight: '500',
  },
  
  versionContainer: {
    alignItems: 'center',
    marginTop: 50,
    paddingBottom: 30,
    gap: 6,
  },
  
  versionText: {
    fontSize: 13,
    color: '#9ca3af',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  
  companyText: {
    fontSize: 12,
    color: '#d1d5db',
    fontWeight: '500',
  },
});

export default MoreTab;