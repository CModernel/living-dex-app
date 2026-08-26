import { StyleSheet, Text, View } from 'react-native'
import { useTheme } from '../theme/ThemeContext'

export default function ListsScreen() {
  const theme = useTheme()

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, gap: theme.spacing.sm }]}>
      <Text style={[styles.title, { color: theme.colors.foreground, fontSize: theme.typography.heading }]}>
        Lists
      </Text>
      <Text style={[styles.subtitle, { color: theme.colors.muted, fontSize: theme.typography.body }]}>
        Manage multiple living dex lists (TODO #16).
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
  },
  subtitle: {
    textAlign: 'center',
  },
})
