import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { TabIcon } from '../../app/components/Icon';

function WebTabBar({ state, descriptors, navigation }) {
  const [safeAreaBottom, setSafeAreaBottom] = useState(0);

  useEffect(() => {
    const computeSafeArea = () => {
      const testEl = document.createElement('div');
      testEl.style.cssText = 'position:fixed;bottom:0;left:0;right:0;height:env(safe-area-inset-bottom,0px);pointer-events:none;';
      document.body.appendChild(testEl);
      const height = testEl.offsetHeight;
      document.body.removeChild(testEl);
      setSafeAreaBottom(height);
    };
    
    computeSafeArea();
    window.addEventListener('resize', computeSafeArea);
    return () => window.removeEventListener('resize', computeSafeArea);
  }, []);

  const getIconName = (routeName, focused) => {
    switch (routeName) {
      case 'Home':
        return focused ? 'lounge' : 'lounge-outline';
      case 'Humidor':
        return focused ? 'cigar-box' : 'cigar-box-outline';
      case 'Events':
        return focused ? 'events' : 'events-outline';
      case 'Vault':
        return focused ? 'albums' : 'albums-outline';
      case 'Profile':
        return focused ? 'person' : 'person-outline';
      case 'Feed':
        return focused ? 'stories' : 'stories-outline';
      default:
        return 'ellipse';
    }
  };

  return (
    <View style={[styles.container, { paddingBottom: safeAreaBottom + 8 }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel !== undefined 
          ? options.tabBarLabel 
          : options.title !== undefined 
            ? options.title 
            : route.name;

        const isFocused = state.index === index;
        const color = isFocused ? '#8B4513' : '#999999';

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            onPress={onPress}
            style={styles.tab}
          >
            <TabIcon 
              name={getIconName(route.name, isFocused)} 
              size={24} 
              color={color} 
              focused={isFocused} 
            />
            <Text style={[styles.label, { color }]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 0.5,
    borderTopColor: '#e5e5e5',
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
});

export default WebTabBar;
