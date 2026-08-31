export interface MockProfile {
  id: string;
  displayName: string;
  email: string;
  phone: string;
  notificationChannel: 'email' | 'sms' | 'none';
  marketingOptIn: boolean;
}

export const initialProfile: MockProfile = {
  id: 'user-1',
  displayName: 'Anisha Shrestha',
  email: 'anisha@example.com',
  phone: '',
  notificationChannel: 'email',
  marketingOptIn: true,
};
