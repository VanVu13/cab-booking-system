import React from 'react';
import { cn } from '../utils/cn';

export function StatusBadge({ status }: { status: string }) {
    let colorClass = 'bg-gray-100 text-gray-800';
    let text = status;

    if (status === 'ACTIVE' || status === 'APPROVED') {
        colorClass = 'bg-green-100 text-green-800 border-green-200';
        text = 'Đã Duyệt';
    } else if (status === 'PENDING_APPROVAL') {
        colorClass = 'bg-yellow-100 text-yellow-800 border-yellow-200';
        text = 'Chờ Duyệt';
    } else if (status === 'REJECTED') {
        colorClass = 'bg-red-100 text-red-800 border-red-200';
        text = 'Từ Chối';
    } else if (status === 'SUSPENDED' || status === 'BLOCKED') {
        colorClass = 'bg-gray-200 text-gray-700 border-gray-300';
        text = 'Đình Chỉ';
    }

    return (
        <span className={cn('px-2.5 py-1 text-xs font-semibold rounded-full border', colorClass)}>
            {text}
        </span>
    );
}
