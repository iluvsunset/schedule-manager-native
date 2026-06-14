import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { GlassProvider } from './src/context/GlassContext';
import { Home, Calendar, Add, Profile, Login } from './src/screens';
import { Home as HomeIcon, Calendar as CalendarIcon, PlusCircle, User } from 'lucide-react-native';
import { View, ActivityIndicator, Platform } from 'react-native';
import { BlurView } from 'expo-blur';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => {
  const { role } = useAuth();
  const { colors, theme } = useTheme();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size, focused }) => {
          const iconSize = focused ? size + 2 : size;
          if (route.name === 'Home') return <HomeIcon size={iconSize} color={color} />;
          if (route.name === 'Calendar') return <CalendarIcon size={iconSize} color={color} />;
          if (route.name === 'Add') return <PlusCircle size={iconSize} color={color} />;
          if (route.name === 'Profile') return <User size={iconSize} color={color} />;
        },
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarBackground: () => (
          <BlurView 
            intensity={Platform.OS === 'ios' ? 30 : 80} 
            tint={theme === 'dark' ? 'dark' : 'light'} 
            style={{ flex: 1, backgroundColor: colors.glass }} 
          />
        ),
        tabBarStyle: {
          position: 'absolute',
          borderTopWidth: 0,
          elevation: 0,
          height: 85,
          paddingBottom: 25,
        },
        headerBackground: () => (
          <BlurView 
            intensity={Platform.OS === 'ios' ? 30 : 80} 
            tint={theme === 'dark' ? 'dark' : 'light'} 
            style={{ flex: 1, backgroundColor: colors.glass }} 
          />
        ),
        headerStyle: {
          height: 100,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: '800',
          letterSpacing: 1,
          fontSize: 17,
        }
      })}
    >
      <Tab.Screen name="Home" component={Home} options={{ headerTitle: 'DASHBOARD' }} />
      <Tab.Screen name="Calendar" component={Calendar} options={{ headerTitle: 'CALENDAR' }} />
      {role !== 'student' && <Tab.Screen name="Add" component={Add} options={{ headerTitle: 'NEW EVENT' }} />}
      <Tab.Screen name="Profile" component={Profile} options={{ headerTitle: 'MY PROFILE' }} />
    </Tab.Navigator>
  );
};

const Navigation = () => {
  const { user, loading } = useAuth();
  const { colors } = useTheme();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Login" component={Login} />
        ) : (
          <Stack.Screen name="Main" component={MainTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <GlassProvider>
          <Navigation />
        </GlassProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
