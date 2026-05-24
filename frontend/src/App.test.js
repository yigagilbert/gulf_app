import { render, screen } from '@testing-library/react';
import PrivacyPolicy from './components/PrivacyPolicy';

test('renders the privacy policy heading', () => {
  render(<PrivacyPolicy />);
  expect(
    screen.getByRole('heading', { name: /Privacy Policy/i })
  ).toBeInTheDocument();
});
