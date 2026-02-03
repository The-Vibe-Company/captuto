'use client';

import { useState, useRef, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

interface InlineCaptionProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

/**
 * Click-to-edit caption component using Tiptap.
 * Shows formatted HTML when not editing, Tiptap editor when clicked.
 */
export function InlineCaption({ content, onChange, placeholder }: InlineCaptionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
      }),
    ],
    content,
    immediatelyRender: false, // Prevent SSR hydration mismatch
    editorProps: {
      attributes: {
        class: 'prose prose-sm focus:outline-none min-h-[1.5em] max-w-none',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Sync content when prop changes
  useEffect(() => {
    if (editor && !isEditing && content !== editor.getHTML()) {
      editor.commands.setContent(content || '');
    }
  }, [content, editor, isEditing]);

  // Focus editor when entering edit mode
  useEffect(() => {
    if (isEditing && editor) {
      editor.commands.focus('end');
    }
  }, [isEditing, editor]);

  // Click outside to close editor
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsEditing(false);
      }
    };

    if (isEditing) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isEditing]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isEditing) {
        setIsEditing(false);
      }
    };

    if (isEditing) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isEditing]);

  // Display mode (not editing)
  if (!isEditing) {
    return (
      <div
        onClick={() => setIsEditing(true)}
        className="cursor-text rounded-md px-2 py-1 transition-colors hover:bg-stone-100"
      >
        {content ? (
          <div
            className="prose prose-sm max-w-none text-stone-800"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        ) : (
          <span className="text-stone-400 italic">
            {placeholder || 'Cliquez pour ajouter une description...'}
          </span>
        )}
      </div>
    );
  }

  // Edit mode
  return (
    <div
      ref={containerRef}
      className="rounded-md border border-violet-300 bg-white px-2 py-1 ring-2 ring-violet-100"
    >
      <EditorContent editor={editor} />
      <div className="mt-1 flex gap-1 border-t border-stone-100 pt-1">
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleBold().run()}
          className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
            editor?.isActive('bold')
              ? 'bg-violet-100 text-violet-700'
              : 'text-stone-500 hover:bg-stone-100'
          }`}
        >
          B
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          className={`rounded px-2 py-0.5 text-xs italic transition-colors ${
            editor?.isActive('italic')
              ? 'bg-violet-100 text-violet-700'
              : 'text-stone-500 hover:bg-stone-100'
          }`}
        >
          I
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleCode().run()}
          className={`rounded px-2 py-0.5 text-xs font-mono transition-colors ${
            editor?.isActive('code')
              ? 'bg-violet-100 text-violet-700'
              : 'text-stone-500 hover:bg-stone-100'
          }`}
        >
          {'</>'}
        </button>
      </div>
    </div>
  );
}
