import { SafeAreaProvider } from 'react-native-safe-area-context'
import RootNavigator from './src/navigation/RootNavigator'
import { UserStateProvider } from './src/state/UserStateContext'
import { ThemeProvider } from './src/theme/ThemeContext'

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <UserStateProvider>
          <RootNavigator />
        </UserStateProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  )
}
