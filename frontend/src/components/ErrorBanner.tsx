interface ErrorBannerProps {
  message: string | null;
}

export default function ErrorBanner({ message }: ErrorBannerProps) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="w-full rounded-md bg-red-600 px-4 py-3 text-sm font-medium text-white"
    >
      {message}
    </div>
  );
}
