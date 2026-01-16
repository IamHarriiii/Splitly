import Sidebar from './Sidebar';
import FloatingChatbot from './FloatingChatbot';

export default function Layout({ children }) {
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
      <FloatingChatbot />
    </div>
  );
}
