/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Topbar } from './Topbar';
import { useEditorStore } from '@/store/editorStore';

const originalState = useEditorStore.getState();

beforeEach(() => {
  useEditorStore.setState({
    ...originalState,
    loadPng: vi.fn(),
    addText: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    resetDesign: vi.fn(),
    canvas: null,
  });
});

afterEach(() => {
  useEditorStore.setState(originalState, true);
});

describe('Topbar', () => {
  it('renders action buttons', () => {
    render(<Topbar />);
    expect(screen.getByRole('button', { name: /Upload PNG/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Text/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Undo/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Redo/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reset/i })).toBeInTheDocument();
  });

  it('calls undo and redo actions', () => {
    const undo = vi.fn();
    const redo = vi.fn();
    useEditorStore.setState({ undo, redo });
    render(<Topbar />);
    fireEvent.click(screen.getByRole('button', { name: /Undo/i }));
    fireEvent.click(screen.getByRole('button', { name: /Redo/i }));
    expect(undo).toHaveBeenCalled();
    expect(redo).toHaveBeenCalled();
  });
});
