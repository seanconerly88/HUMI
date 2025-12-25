// src/navigation/MainTabNavigator.js
import React from 'react';
import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TabIcon } from '../../app/components/Icon';

// Import screens
import HomeScreen from '../../app/index';
import HumidorScreen from '../../app/humidor';
import VaultScreen from '../../app/vault';
import ProfileScreen from '../../app/profile';
import Stories from '../../app/stories';

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          
          if (route.name === 'Home') {
            iconName = focused ? 'lounge' : 'lounge-outline';
          } else if (route.name === 'Humidor') {
            iconName = focused ? 'cigar-box' : 'cigar-box-outline';
          } else if (route.name === 'Vault') {
            iconName = focused ? 'albums' : 'albums-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else if (route.name === 'Feed') {
            iconName = focused ? 'stories' : 'stories-outline';
          }
          
          return <TabIcon name={iconName} size={size} color={color} focused={focused} />;
        },
        tabBarActiveTintColor: '#8B4513',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
          paddingBottom: Platform.OS === 'web' ? 5 : 0,
          height: Platform.OS === 'web' ? 60 : undefined,
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Humidor" component={HumidorScreen} />
      <Tab.Screen name="Feed" component={Stories} />

      {/* Keeping Vault and Profile components in code but not shown in UI */}
      {/* Uncomment these lines to restore them in V2 */}
      {/* 
      <Tab.Screen name="Vault" component={VaultScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} /> 
      */}
    </Tab.Navigator>
  );
}
