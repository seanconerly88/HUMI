// src/navigation/MainTabNavigator.js
import React from 'react';
import { Platform } from 'react-native';
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
  const bottomInset = Platform.OS === 'web' ? Math.max(insets.bottom, 20) : 0;
  const BASE_HEIGHT = 56;
  
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
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 0.5,
          borderTopColor: '#e5e5e5',
          paddingTop: 6,
          paddingBottom: bottomInset + 6,
          height: BASE_HEIGHT + bottomInset,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontSize: 10,
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
