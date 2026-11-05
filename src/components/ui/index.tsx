import type { ButtonHTMLAttributes,InputHTMLAttributes,ReactNode } from 'react';
export function Button({ variant, size, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string }) { return <button {...p} />; };
export function Input(p:InputHTMLAttributes<HTMLInputElement>){return <input {...p}/>};
export function EmptyState({children}:{children:ReactNode}){return <div>{children}</div>};
export function LoadingSpinner(){return <span>Loading…</span>};
