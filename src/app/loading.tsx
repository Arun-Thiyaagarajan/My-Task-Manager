import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[9999] bg-background/90 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
        <div className="flex flex-col items-center gap-4 text-center">
            <div className="relative">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <div className="absolute inset-0 bg-primary/10 rounded-full blur-xl animate-pulse h-12 w-12" />
            </div>
            <div className="space-y-1">
                <p className="font-semibold text-primary tracking-[0.2em] text-[10px] uppercase">
                    Loading
                </p>
                <div className="flex gap-1 justify-center">
                    <div className="h-1 w-1 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="h-1 w-1 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="h-1 w-1 bg-primary rounded-full animate-bounce" />
                </div>
            </div>
        </div>
    </div>
  );
}
