import { render } from '@testing-library/react-native'
import HomeScreen from './HomeScreen'

test('renders the home screen heading', () => {
  const { getByText } = render(<HomeScreen />)
  expect(getByText('Living Dex Organizer')).toBeTruthy()
})
