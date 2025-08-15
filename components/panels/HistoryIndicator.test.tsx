/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { HistoryIndicator } from './HistoryIndicator';
import { useEditorStore } from '@/store/editorStore';

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
const initialState = useEditorStore.getState();

beforeEach(() => {
  useEditorStore.setState(initialState, true);
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  root.unmount();
  document.body.removeChild(container);
  useEditorStore.setState(initialState, true);
});

describe('HistoryIndicator', () => {
  it('displays current history position', () => {
    useEditorStore.setState({ history: [{}, {}, {}] as any, historyIndex: 1 });
    act(() => {
      root.render(<HistoryIndicator />);
    });
    expect(container.textContent).toContain('History 2 / 3');
  });

  it('updates when store changes', () => {
    useEditorStore.setState({ history: [{}, {}, {}] as any, historyIndex: 1 });
    act(() => {
      root.render(<HistoryIndicator />);
    });
    expect(container.textContent).toContain('History 2 / 3');
    act(() => {
      useEditorStore.setState({ history: [{}, {}, {}, {}] as any, historyIndex: 2 });
    });
    expect(container.textContent).toContain('History 3 / 4');
  });
});
