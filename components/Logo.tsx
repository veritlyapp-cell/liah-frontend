'use client';

import Image from 'next/image';

interface LogoProps {
    variant?: 'color' | 'white';
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export default function Logo({
    size = 'md',
    className = ''
}: LogoProps) {
    const sizes = {
        sm: { width: 100, height: 40 },
        md: { width: 150, height: 60 },
        lg: { width: 200, height: 80 },
    };

    const { width, height } = sizes[size];

    return (
        <Image
            src="/Logo_Liah.png"
            alt="LIAH Logo"
            width={width}
            height={height}
            className={className}
            priority
        />
    );
}
