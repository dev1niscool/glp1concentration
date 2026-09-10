import type { Metadata } from 'next';
import { PlotterClient } from '../plotter-client';

export const metadata: Metadata = {
  title: 'Variable injection dates — GLP-1 Concentration Plotter',
  description: 'Plot semaglutide and tirzepatide injections on exact dates, with multiple dates per dose block and an automatically sized timeline.',
};

export default function CustomIntervalsPage() {
  return <PlotterClient key="custom-intervals" variant="custom-intervals" />;
}
