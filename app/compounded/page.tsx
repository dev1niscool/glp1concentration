import type { Metadata } from 'next';
import { PlotterClient } from '../plotter-client';

export const metadata: Metadata = {
  title: 'Compounded GLP-1 Half-Life Simulator',
  description: 'Explore a half-life-only estimate for custom-dose semaglutide, tirzepatide, and investigational retatrutide.',
};

export default function CompoundedPage() {
  return <PlotterClient key="compounded" variant="compounded" />;
}
