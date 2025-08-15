/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { Topbar } from './Topbar';
import { useEditorStore } from '@/store/editorStore';

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
const originalState = useEditorStore.getState();

beforeEach(() => {
  useEditorStore.setState(originalState, true);
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  root.unmount();
  document.body.removeChild(container);
  useEditorStore.setState(originalState, true);
});

describe('Topbar', () => {
  it('renders action buttons', () => {
    act(() => {
      root.render(<Topbar />);
    });
    const text = container.textContent;
    expect(text).toContain('Upload PNG');
    expect(text).toContain('Add Text');
    expect(text).toContain('Undo');
    expect(text).toContain('Redo');
    expect(text).toContain('Reset');
  });

  it('calls undo and redo actions', () => {
    const undo = vi.fn();
    const redo = vi.fn();
    useEditorStore.setState({ undo, redo });
    act(() => {
      root.render(<Topbar />);
    });
    const buttons = Array.from(container.querySelectorAll('button'));
    const undoBtn = buttons.find((b) => b.textContent?.includes('Undo'))!;
    const redoBtn = buttons.find((b) => b.textContent?.includes('Redo'))!;
    act(() => {
      undoBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    act(() => {
      redoBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(undo).toHaveBeenCalled();
    expect(redo).toHaveBeenCalled();
  });
});
