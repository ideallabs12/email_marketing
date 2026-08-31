import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export default function Card({ title, children, className = '', ...props }: CardProps) {
  return (
    <div 
      className={`border border-card-border shadow-sm rounded-xl p-6 bg-surface hover:shadow-md transition-shadow duration-200 ${className}`}
      {...props}
    >
      {title && <h3 className="text-lg font-semibold mb-4 text-foreground/90">{title}</h3>}
      {children}
    </div>
  );
}
