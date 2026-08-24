import type { HTMLAttributes } from 'react';

type MathMlProps = HTMLAttributes<MathMLElement> & {
  columnalign?: string;
  display?: 'block' | 'inline';
  stretchy?: 'false' | 'true';
  width?: string;
};

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      math: MathMlProps;
      mfrac: MathMlProps;
      mi: MathMlProps;
      mn: MathMlProps;
      mo: MathMlProps;
      mrow: MathMlProps;
      mspace: MathMlProps;
      msqrt: MathMlProps;
      msub: MathMlProps;
      msubsup: MathMlProps;
      msup: MathMlProps;
      mtable: MathMlProps;
      mtd: MathMlProps;
      mtext: MathMlProps;
      mtr: MathMlProps;
      munder: MathMlProps;
      munderover: MathMlProps;
    }
  }
}
