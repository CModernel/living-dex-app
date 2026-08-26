import { StyleSheet, Text, View } from 'react-native'
import { useTheme } from '../theme/ThemeContext'

export default function HomeScreen() {
  const theme = useTheme()

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, gap: theme.spacing.sm }]}>
      <Text style={[styles.title, { color: theme.colors.foreground, fontSize: theme.typography.title }]}>
        Living Dex Organizer
      </Text>
      <Text style={[styles.subtitle, { color: theme.colors.muted, fontSize: theme.typography.body }]}>
        Scaffold ready — data table comes next (TODO #20).
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
  },
})
