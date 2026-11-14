import React from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import RouteScreen from '../navigation/RouteScreen';
export default function Screen() {
  const { isAuthenticated } = useAuth();
  const { screen } = useLocalSearchParams();
  const authScreen = ['Login', 'Signup', 'ForgotPassword'].includes(String(screen));
  if (!isAuthenticated && !authScreen) return <Redirect href="/Login" />;
  if (isAuthenticated && authScreen) return <Redirect href="/Home" />;
  return <RouteScreen />;
}
