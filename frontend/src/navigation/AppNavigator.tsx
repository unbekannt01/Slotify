import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { OwnerDashboardScreen } from '../screens/owner/OwnerDashboardScreen';
import { AdminDashboardScreen } from '../screens/admin/AdminDashboardScreen';
import { colors } from '../theme/colors';

const Stack = createNativeStackNavigator();

export const AppNavigator: React.FC = () => {
  const { user, role, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primaryGlow} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: colors.bgCanvas },
        }}
      >
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : role === 'admin' ? (
          <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
        ) : (
          <Stack.Screen name="OwnerDashboard" component={OwnerDashboardScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.bgCanvas,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
