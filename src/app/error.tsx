'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center px-4">
      <div className="max-w-md w-full">
        <div className="mb-8">
            <svg viewBox="0 0 512 350" xmlns="http://www.w3.org/2000/svg">
                <path d="M399.789 253.929L399.789 199.16" stroke="#4F46E5" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" fill="none"></path>
                <path d="M448.868 226.545L350.71 226.545" stroke="#4F46E5" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" fill="none"></path>
                <path d_original="M194.28 107.039L194.28 52.2705" d="M194.28 107.039L194.28 52.2705" stroke="#4F46E5" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" fill="none"></path>
                <path d_original="M243.359 79.6548L145.199 79.6548" d="M243.359 79.6548L145.199 79.6548" stroke="#4F46EU" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" fill="none" transform="rotate(90, 194.279, 79.6548)"></path>
                <path d="M113.161 303.95L113.161 249.181" stroke="#4F46E5" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" fill="none"></path>
                <path d="M162.24 276.565L64.0811 276.565" stroke="#4F46E5" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" fill="none"></path>
                <rect x="231" y="243" width="68" height="68" rx="34" fill="#E0E7FF"></rect>
                <path d="M280.93 234.33L265.86 219.26" stroke="#4F46E5" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" fill="none"></path>
                <rect x="52" y="115" width="298" height="114" rx="12" fill="#E0E7FF"></rect>
                <path d="M52 144H350" stroke="#C7D2FE" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none"></path>
                <path d="M164 115V229" stroke="#C7D2FE" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none"></path>
                <path d="M113 180H215" stroke="#4F46E5" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" fill="none"></path>
                <path d="M113 198H215" stroke="#A5B4FC" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" fill="none"></path>
                <ellipse cx="280" cy="172" rx="20" ry="20" fill="#4F46E5"></ellipse>
                <path d="M279 172L285.5 178.5L279 185" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"></path>
            </svg>
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Something went wrong</h1>
        <p className="mt-6 text-base leading-7 text-muted-foreground">
          We apologize for the inconvenience. An unexpected error occurred. You can try to refresh the page.
        </p>
        <div className="mt-10">
          <Button onClick={() => reset()}>
            Try again
          </Button>
        </div>
      </div>
    </div>
  );
}
