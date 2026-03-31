import React from 'react';
import { render } from '@testing-library/react-native';
import { AuthProvider } from '../src/contexts/AuthContext';

describe('Authentication', () => {
  it('should render AuthProvider without crashing', () => {
    const { getByText } = render(
      <AuthProvider>
        <React.Fragment />
      </AuthProvider>
    );
    expect(true).toBe(true);
  });
});
