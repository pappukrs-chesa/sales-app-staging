import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

const settingsOptions = [
  { iconName: 'person', label: 'Edit Profile', action: () => router.push('/EditProfile') },
  { iconName: 'lock-closed', label: 'Change Password', action: () => router.push('/ChangePassword') },
  { iconName: 'notifications', label: 'Notification Settings', action: () => router.push('/Notifications') },
  { iconName: 'help-circle', label: 'Help & Support', action: () => router.push('/Support') },
  { iconName: 'information-circle', label: 'About App', action: () => router.push('/About') },
];

const SettingsPage = () => {
  const handleLogout = () => {
    AsyncStorage.removeItem(TOKEN_KEY);
    router.navigate('/Login')
  };

  return (
    <ScrollView style={styles.container}>
      {/* Profile Section */}
      <View style={styles.profileContainer}>
        <Image
          source={{ uri: 'https://chesadentalcare.com/assets/img/manoj2304.png' }}
          style={styles.profileIcon}
        />
        <View style={styles.profileTextContainer}>
          <Text style={styles.profileName}>Manoj Kumar</Text>
          <Text style={styles.profileEmail}>manojkup01@gmail.com</Text>
          <Text style={styles.profilePhone}>+91 9108337755</Text>
        </View>
      </View>

      {/* Settings Options */}
      <View style={styles.optionsContainer}>
        {settingsOptions.map((item, index) => (
          <TouchableOpacity key={index} style={styles.optionItem} onPress={item.action}>
            <Ionicons name={item.iconName} size={24} color="#f7931e" style={styles.icon} />
            <Text style={styles.optionLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={24} color="#fff" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 15,
    paddingVertical: 40,
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  profileIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 15,
  },
  profileTextContainer: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  profileEmail: {
    fontSize: 14,
    color: '#777',
  },
  profilePhone: {
    fontSize: 14,
    color: '#777',
  },
  optionsContainer: {
    marginTop: 20,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  icon: {
    marginRight: 15,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff4d4d',
    padding: 15,
    borderRadius: 10,
    justifyContent: 'center',
    marginTop: 30,
  },
  logoutText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 10,
  },
});

export default SettingsPage;
