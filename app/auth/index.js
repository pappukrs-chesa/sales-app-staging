import React, { useState , useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ImageBackground,
  Dimensions,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import { useAuth } from '@/ContextAPI/AuthContext'; // Adjust path as needed
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoginButton from '../../components/loginButton';

const { width, height } = Dimensions.get('window');

const LoginPage = () => {
  const [formData, setFormData] = useState({
    role: '',
    username: '',
    password: '',
    remember: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
   const [isCheckingStorage, setIsCheckingStorage] = useState(true);
  const { login } = useAuth();
  const router = useRouter();

    useEffect(() => {
    checkUserInStorage();
  }, []);

  const checkUserInStorage = async () => {
    try {
      setIsCheckingStorage(true);
      const userData = await AsyncStorage.getItem('user');
      const userToken = await AsyncStorage.getItem('token');
      
      // If user data and token exist, navigate to home (never check expiry)
      if (userData && userToken) {
        router.navigate('/(tabs)/Home');
      }
    } catch (error) {
      console.error('Error checking user in storage:', error);
      // Continue to show login page if there's an error
    } finally {
      setIsCheckingStorage(false);
    }
  };

    if (isCheckingStorage) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F3651B" />
        <Text style={styles.loadingText}>Checking authentication...</Text>
      </View>
    );
  }


  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateForm = () => {
    if (!formData.role) {
      Alert.alert('Error', 'Please select your role!');
      return false;
    }
    if (!formData.username) {
      Alert.alert('Error', 'Please input your Email!');
      return false;
    }
    if (!formData.password) {
      Alert.alert('Error', 'Please input your Password!');
      return false;
    }
    return true;
  };

  const onFinish = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const credentials = {
        sub_role: formData.role,
        sales_person: formData.username,
        password: formData.password,
      };
      await login(credentials, router);
    } catch (error) {
      Alert.alert(
        'Login Error',
        error.message || 'An unexpected error occurred during login.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    // Navigate to forgot password screen or handle accordingly
    Alert.alert('Info', 'Forgot password functionality to be implemented');
  };

  return (
    <ImageBackground
      source={require('@/assets/images/o2up.jpg')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={styles.overlay} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={{
                uri: 'https://chesadentalcare.com/assets/img/logo.png',
              }}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* Login Form */}
          <View style={styles.formContainer}>
            <View style={styles.formHeader}>
              <Text style={styles.title}>CHESA SALES</Text>
              <Text style={styles.subtitle}>Sign in to continue</Text>
            </View>

            {/* Role Selection */}
            {/* Role Selection */}
<View style={styles.inputContainer}>
  <View style={styles.dropdownWrapper}>
    <Ionicons name="briefcase-outline" size={20} color="#6B7280" style={styles.icon} />
    <View style={styles.pickerWrapper}>
      <Picker
        selectedValue={formData.role}
        onValueChange={(value) => handleInputChange('role', value)}
        style={styles.picker}
        dropdownIconColor="#6B7280"
      >
        <Picker.Item label="Select your role" value="" color="#9CA3AF" />
        <Picker.Item label="Sales Head" value="sale_head" />
        <Picker.Item label="CRM" value="coordinator" />
        <Picker.Item label="Sales Employee" value="sale_staff" />
        <Picker.Item label="Telecaller" value="telecaller" />
      </Picker>
    </View>
  </View>
</View>


            {/* Username Input */}
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color="#6B7280" style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="Username"
                  placeholderTextColor="#9CA3AF"
                  value={formData.username}
                  onChangeText={(text) => handleInputChange('username', text)}
                  autoCapitalize="none"
                  keyboardType="default"
                  autoComplete="username"
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="#6B7280" style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#9CA3AF"
                  value={formData.password}
                  onChangeText={(text) => handleInputChange('password', text)}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  <Ionicons
                    name={showPassword ? "eye-outline" : "eye-off-outline"}
                    size={20}
                    color="#6B7280"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Remember Me and Forgot Password */}
            <View style={styles.optionsContainer}>
              <TouchableOpacity
                style={styles.rememberContainer}
                onPress={() => handleInputChange('remember', !formData.remember)}
              >
                <View style={[styles.checkbox, formData.remember && styles.checkboxChecked]}>
                  {formData.remember && (
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  )}
                </View>
                <Text style={styles.rememberText}>Remember me</Text>
              </TouchableOpacity>
              
              <TouchableOpacity onPress={handleForgotPassword}>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
              onPress={onFinish}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>
            {/* Alternative Login Button */}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              © 2025 CHESA DENTAL CARE
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
};

export default LoginPage;

const styles = StyleSheet.create({
  
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 200,
    height: 120,
  },
  formContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  formHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F3651B',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '400',
  },
  inputContainer: {
    marginBottom: 14,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    height: 48,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
  },
 dropdownWrapper: {
  flexDirection: 'row',
  alignItems: 'center',
  borderWidth: 1,
  borderColor: '#E5E7EB',
  borderRadius: 10,
  backgroundColor: '#F9FAFB',
  height: 48,
  paddingHorizontal: 12,
  paddingVertical: Platform.OS === 'ios' ? -10 : 0,
}
,pickerWrapper: {
  flex: 1,
  justifyContent: 'center',
  height: Platform.OS === 'ios' ? 200 : 45,
},

picker: {
  flex: 1,
  fontSize: 15,
  color: Platform.OS === 'ios' ? '#111827' : '#6B7280',
  marginTop: Platform.OS === 'android' ? -10 : -90,  // For Android vertical alignment fix
},

  eyeIcon: {
    padding: 6,
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  rememberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 4,
    marginRight: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: '#F3651B',
    borderColor: '#F3651B',
  },
  rememberText: {
    fontSize: 13,
    color: '#6B7280',
  },
  forgotText: {
    fontSize: 13,
    color: '#F3651B',
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: '#F3651B',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#6B7280',
  },
});
