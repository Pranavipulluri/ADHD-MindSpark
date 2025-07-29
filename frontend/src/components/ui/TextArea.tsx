import React from 'react';
import { twMerge } from 'tailwind-merge';

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  className?: string;
}

const TextArea: React.FC<TextAreaProps> = ({
  label,
  error,
  className = '',
  ...props
}) => {
  const textareaClasses = twMerge(
    'w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring focus:ring-purple-200 transition-all duration-300 outline-none',
    error ? 'border-red-400' : '',
    className
  );
  
  return (
    <div className="mb-4">
      {label && (
        <label className="block text-gray-700 mb-2 font-medium">
          {label}
        </label>
      )}
      <textarea className={textareaClasses} {...props} />
      {error && (
        <p className="mt-1 text-red-500 text-sm">{error}</p>
      )}
    </div>
  );
};

export default TextArea;