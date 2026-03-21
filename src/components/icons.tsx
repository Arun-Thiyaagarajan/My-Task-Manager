import type { SVGProps } from 'react';

export const Icons = {
  logo: (props: SVGProps<SVGSVGElement>) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* Background geometric shape for "Flow" */}
      <path 
        d="M12 2L3 7V17L12 22L21 17V7L12 2Z" 
        strokeOpacity="0.1" 
        fill="currentColor" 
        fillOpacity="0.05"
      />
      {/* Main Task/T mark */}
      <path d="M9 12l2 2 4-4" />
      <path d="M12 2v20" strokeOpacity="0.2" />
      <path d="M5 7l7-5 7 5" />
      <path d="M12 22l-7-5" strokeOpacity="0.2" />
      <path d="M12 22l7-5" strokeOpacity="0.2" />
      
      {/* Modern Flow Indicator */}
      <path 
        d="M2 12h3m14 0h3" 
        strokeWidth="1.5"
        strokeOpacity="0.3"
      />
    </svg>
  ),
};
