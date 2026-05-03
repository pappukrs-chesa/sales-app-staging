// utils/CacheManager.js
import AsyncStorage from '@react-native-async-storage/async-storage';

class CacheManager {
  static CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

  static async setCache(key, data, neverExpire = false) {
    try {
      const cacheData = {
        data,
        timestamp: Date.now(),
        neverExpire: neverExpire
      };
      await AsyncStorage.setItem(key, JSON.stringify(cacheData));
      console.log(`✅ Cache set for key: ${key}${neverExpire ? ' (never expires)' : ''}`);
    } catch (error) {
      console.error('❌ Cache set error:', error);
    }
  }

  static async getCache(key) {
    try {
      const cached = await AsyncStorage.getItem(key);
      if (!cached) {
        console.log(`🔍 No cache found for key: ${key}`);
        return null;
      }

      const { data, timestamp, neverExpire } = JSON.parse(cached);
      
      // If cache is set to never expire, return data immediately
      if (neverExpire) {
        console.log(`✅ Cache hit for key: ${key} (never expires)`);
        return data;
      }
      
      // Check expiry for normal cache
      if (Date.now() - timestamp > this.CACHE_EXPIRY) {
        await AsyncStorage.removeItem(key);
        console.log(`⏰ Cache expired for key: ${key}`);
        return null;
      }
      
      console.log(`✅ Cache hit for key: ${key}`);
      return data;
    } catch (error) {
      console.error('❌ Cache get error:', error);
      return null;
    }
  }

  static async clearCache(key) {
    try {
      await AsyncStorage.removeItem(key);
      console.log(`🗑️ Cache cleared for key: ${key}`);
    } catch (error) {
      console.error('❌ Cache clear error:', error);
    }
  }

  static async clearAllCache() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => 
        key.startsWith('waiting_orders') || 
        key.startsWith('order_') || 
        key.startsWith('sales_emp_') ||
        key.startsWith('leads_')
      );
      await AsyncStorage.multiRemove(cacheKeys);
      console.log('🗑️ All cache cleared');
    } catch (error) {
      console.error('❌ Clear all cache error:', error);
    }
  }
}

export default CacheManager;