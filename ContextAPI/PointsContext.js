import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

const PointsContext = createContext();

export const PointsProvider = ({ children }) => {
  const [earnedPoints, setEarnedPoints] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastEmployeeId, setLastEmployeeId] = useState(null);
  const [lastLoginTime, setLastLoginTime] = useState(null);

  const fetchPoints = async () => {
//     try {
//       setLoading(true);
//       setError(null);
      
//       const employeeId = await AsyncStorage.getItem('employeeID');
//       if (!employeeId) {
//         console.log('No employee ID found, setting points to 0');
//         setEarnedPoints(0);
//         setLoading(false);
//         return;
//       }

//       const response = await fetch(`https://api.chesadentalcare.com/get_points?employeeid=${employeeId}`, {
//         method: 'GET',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//       });

//       if (!response.ok) {
//         throw new Error(`HTTP error! status: ${response.status}`);
//       }

//      let data;
// try {
//   data = await response.json();
// } catch {
//   console.log("Non JSON response");
//   return;
// }

//        if (data.message === "No Employee Data Found") {
//       console.log("No points data, setting 0");
//       setEarnedPoints(0);
//       return; // ❗ stop here, no error
//     }
      
//       if (data && data.length > 0) {
//         const points = data[0].points;
//         setEarnedPoints(points);
//         await AsyncStorage.setItem('points', points.toString());
//       } else {
//         setEarnedPoints(0);
//         await AsyncStorage.setItem('points', '0');
//       }
//     } catch (error) {
//       console.error('Error fetching points:', error);
//       setError(error.message);
//       setEarnedPoints(0);
      
//       // Try to get cached points from storage
//       try {
//         const cachedPoints = await AsyncStorage.getItem('points');
//         if (cachedPoints) {
//           setEarnedPoints(parseInt(cachedPoints));
//         }
//       } catch (cacheError) {
//         console.error('Error getting cached points:', cacheError);
//       }
//     } finally {
//       setLoading(false);
//     }
return 1;
  };

  const addPointsToTable = async (points, activityType) => {
    try {
      setLoading(true);
      setError(null);
      
      const employeeId = await AsyncStorage.getItem('employeeID');
      console.log('Adding points - Employee ID from storage:', employeeId);
      
      if (!employeeId) {
        // Try alternative key names
        const altEmployeeId = await AsyncStorage.getItem('employee_id') || 
                             await AsyncStorage.getItem('emp_id') ||
                             await AsyncStorage.getItem('empId');
        console.log('Alternative employee ID:', altEmployeeId);
        
        if (!altEmployeeId) {
          throw new Error('No employee ID found in storage');
        }
        
        // Use the alternative ID and store it in the correct key for future use
        await AsyncStorage.setItem('employeeID', altEmployeeId);
        console.log('Using alternative employee ID:', altEmployeeId);
      }

      const response = await fetch('https://api.chesadentalcare.com/add_points', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeid: employeeId,
          points: points,
          activity_type: activityType,
        }),
      });

      const result = await response.json();
      
      if (response.ok) {
        console.log('Points added successfully:', result);
        
        // Refresh points after adding
        await fetchPoints();
        
        // Show success alert
        Alert.alert(
          'Success',
          `${points} points added successfully!`,
          [{ text: 'OK' }]
        );
        
        return true;
      } else {
        throw new Error(result.message || 'Failed to add points');
      }
    } catch (error) {
      console.error('Error adding points:', error);
      setError(error.message);
      
      Alert.alert(
        'Error',
        `Failed to add points: ${error.message}`,
        [{ text: 'OK' }]
      );
      
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updatePointsLocally = (newPoints) => {
    setEarnedPoints(newPoints);
    AsyncStorage.setItem('points', newPoints.toString()).catch(error => {
      console.error('Error saving points locally:', error);
    });
  };

  const clearPoints = async () => {
    try {
      setEarnedPoints(0);
      await AsyncStorage.removeItem('points');
    } catch (error) {
      console.error('Error clearing points:', error);
    }
  };

  const refreshPoints = async () => {
    await fetchPoints();
  };

  useEffect(() => {
    // Initial fetch
    const initialCheck = async () => {
      const currentEmployeeId = await AsyncStorage.getItem('employeeID');
      const currentLoginTime = await AsyncStorage.getItem('lastLoginTime');
      setLastEmployeeId(currentEmployeeId);
      setLastLoginTime(currentLoginTime);
      fetchPoints();
    };
    
    initialCheck();
    
    // Listen for employee ID changes and login events
    const checkForUpdates = async () => {
      const currentEmployeeId = await AsyncStorage.getItem('employeeID');
      const currentLoginTime = await AsyncStorage.getItem('lastLoginTime');
      
      // Check if login time changed (new login)
      if (currentLoginTime && currentLoginTime !== lastLoginTime) {
        // console.log('New login detected, refreshing points');
        setLastLoginTime(currentLoginTime);
        if (currentEmployeeId) {
          fetchPoints();
        }
        return;
      }
      
      // If employee ID changed, update points
      if (currentEmployeeId !== lastEmployeeId) {
        console.log('Employee ID changed from', lastEmployeeId, 'to', currentEmployeeId);
        setLastEmployeeId(currentEmployeeId);
        
        if (!currentEmployeeId) {
          // Employee ID was cleared, clear points (logout)
          console.log('Employee ID cleared, clearing points');
          clearPoints();
        } else {
          // Employee ID is available, fetch points (login or user change)
          console.log('Employee ID found, fetching points for:', currentEmployeeId);
          fetchPoints();
        }
      }
    };
    
    const interval = setInterval(checkForUpdates, 2000); // Check every 2 seconds
    return () => clearInterval(interval);
  }, []); // Empty dependency array for initial setup only

  return (
    <PointsContext.Provider 
      value={{ 
        earnedPoints, 
        addPointsToTable, 
        updatePointsLocally,
        clearPoints,
        refreshPoints,
        loading,
        error 
      }}
    >
      {children}
    </PointsContext.Provider>
  );
};

export const usePoints = () => {
  const context = useContext(PointsContext);
  if (!context) {
    throw new Error('usePoints must be used within a PointsProvider');
  }
  return context;
};