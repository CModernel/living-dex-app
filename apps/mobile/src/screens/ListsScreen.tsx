import { StyleSheet, Text, View } from 'react-native'

export default function ListsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Lists</Text>
      <Text style={styles.subtitle}>Manage multiple living dex lists (TODO #16).</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
})
