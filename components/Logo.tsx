'use client';

import Image from 'next/image';

interface LogoProps {
    className?: string;
    size?: 'xs' | 'sm' | 'md' | 'lg';
    variant?: 'full' | 'icon' | 'white';
}

export default function Logo({ className = '', size = 'md', variant = 'full' }: LogoProps) {
    const sizeMap = {
        xs: 'h-4',
        sm: 'h-8',
        md: 'h-12',
        lg: 'h-24'
    };

    if (variant === 'full') {
        return (
            <div className={`relative ${sizeMap[size]} ${className}`}>
                <Image
                    src="/Logo_Liah.png"
                    alt="LIAH Logo"
                    height={100}
                    width={200}
                    className="h-full w-auto object-contain"
                    priority
                />
            </div>
        );
    }

    const iconSizeMap = {
        xs: 16,
        sm: 24,
        md: 32,
        lg: 48
    };

    return (
        <div className={`flex items-center gap-2.5 ${className}`}>
            {/* Minimalist Liah Isotype */}
            <div
                className={`relative flex items-center justify-center shrink-0 overflow-hidden bg-brand rounded-xl shadow-lg shadow-brand/20`}
                style={{ width: iconSizeMap[size], height: iconSizeMap[size] }}
            >
                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-2/3 h-2/3 text-white"
                >
                    <path
                        d="M12 4L4 12L12 20L20 12L12 4Z"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <circle cx="12" cy="12" r="2" fill="currentColor" />
                </svg>
            </div>
        </div>
    );
}
