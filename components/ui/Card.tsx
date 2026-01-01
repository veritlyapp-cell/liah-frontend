'use client';

import { HTMLAttributes, forwardRef } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    variant?: 'glass' | 'white' | 'gradient';
}

const Card = forwardRef<HTMLDivElement, CardProps>(
    ({ variant = 'glass', className = '', children, ...props }, ref) => {
        const variants = {
            glass: 'glass-card',
            white: 'bg-white border border-gray-200 shadow-md',
            gradient: 'bg-gradient-card border border-violet-100'
        };

        return (
            <div
                ref={ref}
                className={`rounded-2xl p-6 ${variants[variant]} ${className}`}
                {...props}
            >
                {children}
            </div>
        );
    }
);

Card.displayName = 'Card';

export default Card;
