// src/navigation/MainTabNavigator.js
import React from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabIcon } from '../../app/components/Icon';

// Import screens
import HomeScreen from '../../app/index';
import HumidorScreen from '../../app/humidor';
import VaultScreen from '../../app/vault';
import ProfileScreen from '../../app/profile';
import Stories from '../../app/stories';
import EventsScreen from '../../app/events';

const Tab = createBottomTabNavigator();

function TabNavigatorContent() {
  const insets = useSafeAreaInsets();
  
  // For iOS PWA: use CSS env() for safe area, native uses insets
  const isWeb = Platform.OS === 'web';
  
  const tabBarStyle = isWeb ? {
    backgroundColor: '#ffffff',
    borderTopWidth: 0.5,
    borderTopColor: '#e5e5e5',
    paddingTop: 8,
    paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
    minHeight: 65,
    elevation: 0,
    shadowOpacity: 0,
  } : {
    backgroundColor: '#ffffff',
    borderTopWidth: 0.5,
    borderTopColor: '#e5e5e5',
    paddingTop: 8,
    paddingBottom: insets.bottom + 4,
    height: 60 + insets.bottom,
    elevation: 0,
    shadowOpacity: 0,
  };
  
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
          } else if (route.name === 'Events') {
            iconName = focused ? 'events' : 'events-outline';
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
        tabBarInactiveTintColor: '#999999',
        headerShown: false,
        tabBarStyle: tabBarStyle,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
          marginBottom: 4,
        },
        tabBarShowLabel: true,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Humidor" component={HumidorScreen} />
      <Tab.Screen name="Feed" component={Stories} />
      <Tab.Screen name="Events" component={EventsScreen} />

      {/* Keeping Vault and Profile components in code but not shown in UI */}
      {/* Uncomment these lines to restore them in V2 */}
      {/* 
      <Tab.Screen name="Vault" component={VaultScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} /> 
      */}
    </Tab.Navigator>
  );
}

export default function MainTabNavigator() {
  return <TabNavigatorContent />;
}
