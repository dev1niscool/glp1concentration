import type { Metadata } from 'next';
import { ProfileClient } from './profile-client';

export const metadata: Metadata = {
  title: 'My Profile — GLP-1 Concentration Plotter',
  description: 'Keep and update your injection dates and doses, export a backup, or import a profile to use with the plotter.',
};

export default function ProfilePage() {
  return <ProfileClient />;
}
