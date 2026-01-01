'use client';

import { ReactNode } from 'react';

interface KPICardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon?: ReactNode;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    color?: 'violet' | 'cyan' | 'green' | 'amber' | 'red' | 'blue';
    size?: 'sm' | 'md' | 'lg';
}

const colorClasses = {
    violet: {
        bg: 'bg-gradient-to-br from-violet-500 to-purple-600',
        light: 'bg-violet-50',
        text: 'text-violet-600',
        icon: 'bg-violet-100 text-violet-600'
    },
    cyan: {
        bg: 'bg-gradient-to-br from-cyan-500 to-blue-600',
        light: 'bg-cyan-50',
        text: 'text-cyan-600',
        icon: 'bg-cyan-100 text-cyan-600'
    },
    green: {
        bg: 'bg-gradient-to-br from-green-500 to-emerald-600',
        light: 'bg-green-50',
        text: 'text-green-600',
        icon: 'bg-green-100 text-green-600'
    },
    amber: {
        bg: 'bg-gradient-to-br from-amber-500 to-orange-600',
        light: 'bg-amber-50',
        text: 'text-amber-600',
        icon: 'bg-amber-100 text-amber-600'
    },
    red: {
        bg: 'bg-gradient-to-br from-red-500 to-rose-600',
        light: 'bg-red-50',
        text: 'text-red-600',
        icon: 'bg-red-100 text-red-600'
    },
    blue: {
        bg: 'bg-gradient-to-br from-blue-500 to-indigo-600',
        light: 'bg-blue-50',
        text: 'text-blue-600',
        icon: 'bg-blue-100 text-blue-600'
    }
};

export default function KPICard({
    title,
    value,
    subtitle,
    icon,
    trend,
    color = 'violet',
    size = 'md'
}: KPICardProps) {
    const colors = colorClasses[color];

    return (
        <div className="p-5 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    {title}
                </p>
                {icon && (
                    <div className={`${colors.text} p-2 rounded-lg`}>
                        {icon}
                    </div>
                )}
            </div>

            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                    <p className="text-3xl font-extrabold text-gray-900 tracking-tight">
                        {typeof value === 'number' ? value.toLocaleString() : value}
                    </p>
                    {trend && (
                        <div className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-bold ${trend.isPositive ? 'text-green-500' : 'text-red-500'}`}>
                            <span>{trend.isPositive ? '↑' : '↓'}</span>
                            <span>{Math.abs(trend.value)}%</span>
                        </div>
                    )}
                </div>
                {subtitle && (
                    <p className="text-xs text-gray-400 font-medium">{subtitle}</p>
                )}
            </div>
        </div>
    );
}
