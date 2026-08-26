import { Ionicons } from '@expo/vector-icons'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native'
import HomeScreen from '../screens/HomeScreen'
import ListsScreen from '../screens/ListsScreen'
import SettingsScreen from '../screens/SettingsScreen'
import { useTheme } from '../theme/ThemeContext'

type TabParamList = {
  Home: undefined
  Lists: undefined
  Settings: undefined
}

const Tab = createBottomTabNavigator<TabParamList>()

const TAB_ICONS: Record<keyof TabParamList, keyof typeof Ionicons.glyphMap> = {
  Home: 'home',
  Lists: 'list',
  Settings: 'settings',
}

export default function RootNavigator() {
  const theme = useTheme()
  const navigationTheme = {
    ...(theme.colors.background === '#0a0a0a' ? DarkTheme : DefaultTheme),
    colors: {
      ...(theme.colors.background === '#0a0a0a' ? DarkTheme.colors : DefaultTheme.colors),
      primary: theme.colors.brand,
      background: theme.colors.background,
      card: theme.colors.background,
      text: theme.colors.foreground,
      border: theme.colors.border,
    },
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={TAB_ICONS[route.name as keyof TabParamList]} color={color} size={size} />
          ),
          tabBarActiveTintColor: theme.colors.brand,
          tabBarInactiveTintColor: theme.colors.muted,
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Lists" component={ListsScreen} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  )
}
