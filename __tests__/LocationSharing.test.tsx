import { render, fireEvent, waitFor } from '@testing-library/react';
import LocationSharing from '../components/LocationSharing';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

describe('LocationSharing', () => {
  beforeEach(() => {
    // Mock geolocation
    const mockGeolocation = {
      getCurrentPosition: jest.fn(),
      watchPosition: jest.fn()
    };
    global.navigator.geolocation = mockGeolocation;
  });

  it('starts sharing location when button is clicked', async () => {
    const { getByText } = render(
      <QueryClientProvider client={queryClient}>
        <LocationSharing />
      </QueryClientProvider>
    );

    fireEvent.click(getByText('Start Sharing Location'));

    await waitFor(() => {
      expect(navigator.geolocation.watchPosition).toHaveBeenCalled();
    });
  });
}); 