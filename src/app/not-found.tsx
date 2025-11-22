import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center px-4">
      <div className="max-w-md w-full">
        <div className="mb-8">
            <svg viewBox="0 0 512 350" xmlns="http://www.w3.org/2000/svg">
                <path d="M309.282 63.9873L309.282 18.2188" stroke="#4F46E5" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" fill="none"></path>
                <path d="M358.361 41.103L260.202 41.103" stroke="#4F46E5" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" fill="none" transform="rotate(90, 309.281, 41.103)"></path>
                <path d="M433.282 144.987L433.282 99.2188" stroke="#4F46E5" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" fill="none"></path>
                <path d="M482.361 122.103L384.202 122.103" stroke="#4F46E5" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" fill="none" transform="rotate(90, 433.281, 122.103)"></path>
                <path d="M380.282 250.987L380.282 205.219" stroke="#4F46E5" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" fill="none"></path>
                <path d="M429.361 228.103L331.202 228.103" stroke="#4F46E5" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" fill="none" transform="rotate(90, 380.281, 228.103)"></path>
                <rect x="52" y="59" width="308" height="232" rx="12" fill="#E0E7FF"></rect>
                <path d="M52 101H360" stroke="#C7D2FE" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none"></path>
                <path d="M52 143H360" stroke="#C7D2FE" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none"></path>
                <path d="M52 185H360" stroke="#C7D2FE" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none"></path>
                <path d="M52 227H360" stroke="#C7D2FE" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none"></path>
                <path d="M124 59V291" stroke="#C7D2FE" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none"></path>
                <path d="M204 59V291" stroke="#C7D2FE" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none"></path>
                <path d="M284 59V291" stroke="#C7D2FE" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none"></path>
                <ellipse cx="204" cy="175" rx="42" ry="42" fill="#4F46E5"></ellipse>
                <ellipse cx="204" cy="175" rx="18" ry="18" fill="white"></ellipse>
                <path d="M204 157V193" stroke="#4F46E5" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none"></path>
                <path d="M186 175H222" stroke="#4F46E5" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none"></path>
            </svg>
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Page Not Found</h1>
        <p className="mt-6 text-base leading-7 text-muted-foreground">
          Sorry, we couldn’t find the page you’re looking for. It might have been moved, deleted, or you may have mistyped the address.
        </p>
        <div className="mt-10">
          <Button asChild>
            <Link href="/">Go back home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
