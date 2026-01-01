'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'gradient' | 'solid' | 'outline' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({
        variant = 'solid',
        size = 'md',
        isLoading = false,
        className = '',
        children,
        disabled,
        ...props
    }, ref) => {
        const baseStyles = 'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2';

        const variants = {
            gradient: 'gradient-bg text-white hover:opacity-90 shadow-md hover:shadow-lg transform hover:scale-[1.02]',
            solid: 'bg-violet-600 text-white hover:bg-violet-700 shadow-sm',
            outline: 'border-2 border-violet-500 text-violet-600 hover:bg-violet-50',
            ghost: 'text-violet-600 hover:bg-violet-50'
        };

        const sizes = {
            sm: 'px-3 py-1.5 text-sm rounded-lg',
            md: 'px-4 py-2.5 text-base rounded-xl',
            lg: 'px-6 py-3 text-lg rounded-xl'
        };

        return (
            <button
                ref={ref}
                disabled={disabled || isLoading}
                className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
                {...props}
            >
                {isLoading ? (
                    <>
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                            <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                                fill="none"
                            />
                            <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                        </svg>
                        Cargando...
                    </>
                ) : children}
            </button>
        );
    }
);

Button.displayName = 'Button';

export default Button;
