import type { Metadata } from 'next';
import { PlotterClient } from '../plotter-client';

export const metadata: Metadata = {
  title: 'Choose your own intervals — GLP-1 Concentration Plotter',
  description: 'Plot semaglutide and tirzepatide injections on exact dates, with a separate dose for each injection and an automatically sized timeline.',
};

export default function CustomIntervalsPage() {
  return <PlotterClient key="custom-intervals" variant="custom-intervals" />;
}
