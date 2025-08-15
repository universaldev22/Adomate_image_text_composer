/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HistoryIndicator } from './HistoryIndicator';
import { useEditorStore } from '@/store/editorStore';

const initialState = useEditorStore.getState();

beforeEach(() => {
  useEditorStore.setState(initialState, true);
});

afterEach(() => {
  useEditorStore.setState(initialState, true);
});

describe('HistoryIndicator', () => {
  it('displays current history position', () => {
    useEditorStore.setState({ history: [{}, {}, {}] as any, historyIndex: 1 });
    render(<HistoryIndicator />);
    expect(screen.getByText('History 2 / 3')).toBeInTheDocument();
  });

  it('updates when store changes', () => {
    useEditorStore.setState({ history: [{}, {}, {}] as any, historyIndex: 1 });
    render(<HistoryIndicator />);
    expect(screen.getByText('History 2 / 3')).toBeInTheDocument();
    useEditorStore.setState({ history: [{}, {}, {}, {}] as any, historyIndex: 2 });
    expect(screen.getByText('History 3 / 4')).toBeInTheDocument();
  });
});
