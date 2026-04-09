// src/navigation/MainTabNavigator.js
import React from 'react';
import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabIcon } from '../../app/components/Icon';
import WebTabBar from './WebTabBar';
import useBetaTester from '../hooks/useBetaTester';

// Import screens
import HomeScreen from '../../app/index';
import HumidorScreen from '../../app/humidor';
import VaultScreen from '../../app/vault';
import ProfileScreen from '../../app/profile';
import Stories from '../../app/stories';
import EventsScreen from '../../app/events';
import LoungesScreen from '../../app/lounges';

const Tab = createBottomTabNavigator();

function TabNavigatorContent() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';
  const isBeta = useBetaTester();
  
  // Native: use insets from useSafeAreaInsets
  const nativeTabBarStyle = {
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
      tabBar={isWeb ? (props) => <WebTabBar {...props} /> : undefined}
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          
          if (route.name === 'Home') {
            iconName = focused ? 'lounge' : 'lounge-outline';
          } else if (route.name === 'Humidor') {
            iconName = focused ? 'cigar-box' : 'cigar-box-outline';
          } else if (route.name === 'Events') {
            iconName = focused ? 'events' : 'events-outline';
          } else if (route.name === 'Spots') {
            iconName = focused ? 'lounges' : 'lounges-outline';
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
        tabBarStyle: isWeb ? undefined : nativeTabBarStyle,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
          marginBottom: 4,
        },
        tabBarShowLabel: true,
        safeAreaInsets: isWeb ? { bottom: 0, top: 0 } : undefined,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Humidor" component={HumidorScreen} />
      {/* Beta testers: Spots tab in position 3. Everyone else: Events tab. */}
      {isBeta
        ? <Tab.Screen name="Spots" component={LoungesScreen} />
        : <Tab.Screen name="Events" component={EventsScreen} />
      }
      <Tab.Screen name="Feed" component={Stories} />
      {/* Keeping Vault and Profile components in code but not shown in UI */}
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
