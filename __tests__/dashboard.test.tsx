import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { DashboardContent } from '@/components/dashboard/dashboard-content';
import '@testing-library/jest-dom';

// Mock dependencies
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signOut: jest.fn(),
    },
  }),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

jest.mock('@/components/providers/locale-provider', () => ({
    useTranslation: () => ({
      t: (key: string) => key,
    }),
    useLocale: () => ({
        locale: 'en',
        setLocale: jest.fn(),
    }),
}));

// Mock Lucide icons
jest.mock('lucide-react', () => {
    const originalModule = jest.requireActual('lucide-react');
    return {
        ...originalModule,
        Sparkles: () => <svg />,
        History: () => <svg />,
        User: () => <svg />,
        LogOut: () => <svg />,
        Plus: () => <svg />,
        Square: () => <svg />,
        RectangleHorizontal: () => <svg />,
        RectangleVertical: () => <svg />,
        Settings2: () => <svg />,
        Zap: () => <svg />,
        ImageIcon: () => <svg />,
        Rocket: () => <svg />,
        PenTool: () => <svg />,
        Palette: () => <svg />,
        Brain: () => <svg />,
        Bot: () => <svg />,
        Folder: () => <svg />,
        Menu: () => <svg />,
        UserCircle: () => <svg />,
        Trash2: () => <svg />,
        Lock: () => <svg />,
        Shield: () => <svg />,
        RefreshCw: () => <svg />,
        Wand2: () => <svg />,
        Edit: () => <svg />,
        Paintbrush: () => <svg />,
        RotateCcw: () => <svg />,
        Undo2: () => <svg />,
        ChevronDown: () => <svg />,
        ChevronUp: () => <svg />,
        Lightbulb: () => <svg />,
        Copy: () => <svg />,
    };
});


describe('DashboardContent', () => {
  it('should not be stuck in a loading state for unauthenticated users', async () => {
    render(<DashboardContent initialImages={[]} />);

    // Wait for the component to finish its initial loading logic
    await waitFor(() => {
      // We expect the "Generate" tab to be visible after loading is complete.
      // This confirms the UI is not stuck in a loading state.
      expect(screen.getByText('dashboard.tabs.generate')).toBeInTheDocument();
    });

  });
});