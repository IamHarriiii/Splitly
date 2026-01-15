export default function LoadingSpinner({ size = 'md', text = '' }) {
  const sizes = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-3',
    lg: 'h-12 w-12 border-4'
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className={`${sizes[size]} border-blue-600 border-t-transparent rounded-full animate-spin`}></div>
      {text && <p className="text-sm text-gray-600">{text}</p>}
    </div>
  );
}
