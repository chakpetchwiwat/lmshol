import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Bold, Eraser, ImagePlus, Italic, Link2, Palette, Underline } from 'lucide-react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import { normalizeLessonContentToHtml } from '../../utils/richText';
import RichTextImage from './RichTextImage';

const DEFAULT_TEXT_COLOR = '#1e293b';

const normalizeLinkUrl = (value) => {
  const trimmedValue = value.trim();
  if (!trimmedValue) return '';
  if (/^(https?:|mailto:|tel:|#|\/)/i.test(trimmedValue)) return trimmedValue;
  return `https://${trimmedValue}`;
};

const getImageFiles = (fileList) => Array.from(fileList || [])
  .filter((file) => file.type?.startsWith('image/'));

const ToolbarButton = ({ active = false, disabled = false, label, onClick, children }) => (
  <button
    type="button"
    className="rich-text-editor__button"
    data-active={active}
    aria-pressed={active}
    aria-label={label}
    title={label}
    disabled={disabled}
    onClick={onClick}
  >
    {children}
  </button>
);

const RichTextEditor = ({
  label,
  value,
  onChange,
  onImageUpload,
  imageUploading = false,
  minHeight = 280,
}) => {
  const colorInputId = useId();
  const imageInputId = useId();
  const imageInputRef = useRef(null);
  const [, setToolbarVersion] = useState(0);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);

  const normalizedValue = useMemo(
    () => normalizeLessonContentToHtml(value),
    [value],
  );

  const insertImageAtPosition = (editorInstance, imageAttributes, position) => {
    if (!editorInstance) return;

    if (typeof position === 'number') {
      editorInstance
        .chain()
        .focus()
        .insertContentAt(position, {
          type: 'image',
          attrs: imageAttributes,
        })
        .run();
      return;
    }

    editorInstance.chain().focus().setImage(imageAttributes).run();
  };

  const uploadAndInsertImages = async (files, getPosition) => {
    if (!editor || !onImageUpload || files.length === 0) return false;

    try {
      setIsUploadingImage(true);

      for (const file of files) {
        const imageUrl = await onImageUpload(file);
        if (!imageUrl) continue;

        const nextPosition = typeof getPosition === 'function' ? getPosition() : null;
        insertImageAtPosition(editor, {
          src: imageUrl,
          alt: file.name,
          title: file.name,
          dataAlign: 'center',
        }, nextPosition);
      }

      return true;
    } finally {
      setIsUploadingImage(false);
      setIsDragActive(false);
    }
  };

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        horizontalRule: false,
      }),
      TextStyle,
      Color,
      RichTextImage.configure({
        inline: false,
        allowBase64: false,
      }),
    ],
    content: normalizedValue,
    editorProps: {
      attributes: {
        class: 'rich-text-editor__content',
      },
      handleDrop: (view, event, moved) => {
        if (moved) return false;

        const imageFiles = getImageFiles(event.dataTransfer?.files);
        if (imageFiles.length === 0) return false;

        event.preventDefault();
        const coordinates = view.posAtCoords({
          left: event.clientX,
          top: event.clientY,
        });

        uploadAndInsertImages(imageFiles, () => coordinates?.pos ?? null);
        return true;
      },
      handlePaste: (_view, event) => {
        const imageFiles = getImageFiles(event.clipboardData?.files);
        if (imageFiles.length === 0) return false;

        event.preventDefault();
        uploadAndInsertImages(imageFiles);
        return true;
      },
      handleDOMEvents: {
        dragenter: (_view, event) => {
          const imageFiles = getImageFiles(event.dataTransfer?.files);
          if (imageFiles.length > 0) {
            setIsDragActive(true);
          }
          return false;
        },
        dragover: (_view, event) => {
          const imageFiles = getImageFiles(event.dataTransfer?.files);
          if (imageFiles.length > 0) {
            event.preventDefault();
            setIsDragActive(true);
          }
          return false;
        },
        dragleave: (_view, event) => {
          if (event.currentTarget === event.target) {
            setIsDragActive(false);
          }
          return false;
        },
        drop: () => {
          setIsDragActive(false);
          return false;
        },
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChange?.(currentEditor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return undefined;

    const rerender = () => setToolbarVersion((current) => current + 1);
    editor.on('selectionUpdate', rerender);
    editor.on('transaction', rerender);

    return () => {
      editor.off('selectionUpdate', rerender);
      editor.off('transaction', rerender);
    };
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    const currentHtml = editor.getHTML();
    if (currentHtml === normalizedValue) return;
    editor.commands.setContent(normalizedValue || '<p></p>', false);
  }, [editor, normalizedValue]);

  const handleLinkAction = () => {
    if (!editor) return;

    const previousUrl = editor.getAttributes('link').href || '';
    const nextUrl = window.prompt('ใส่ลิงก์ที่ต้องการ', previousUrl);

    if (nextUrl === null) return;

    if (!nextUrl.trim()) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({ href: normalizeLinkUrl(nextUrl) })
      .run();
  };

  const handleColorChange = (event) => {
    if (!editor) return;

    const nextColor = event.target.value;
    if (nextColor.toLowerCase() === DEFAULT_TEXT_COLOR) {
      editor.chain().focus().unsetColor().run();
      return;
    }

    editor.chain().focus().setColor(nextColor).run();
  };

  const handleClearFormatting = () => {
    if (!editor) return;
    editor.chain().focus().unsetAllMarks().clearNodes().run();
  };

  const handleImageSelection = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    await uploadAndInsertImages([file]);
  };

  const handleEditorKeyDown = (event) => {
    if (!editor) return;

    const isShortcut = event.ctrlKey || event.metaKey;
    if (!isShortcut) return;

    if (event.key.toLowerCase() === 'k') {
      event.preventDefault();
      handleLinkAction();
    }
  };

  const activeColor = editor?.getAttributes('textStyle').color || DEFAULT_TEXT_COLOR;
  const isImageBusy = imageUploading || isUploadingImage;

  return (
    <div className="rich-text-shell" aria-label={label}>
      <div className="rich-text-editor__toolbar" role="toolbar" aria-label={`${label} tools`}>
        <ToolbarButton
          active={editor?.isActive('bold')}
          label="ตัวหนา (Ctrl+B)"
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <Bold size={16} />
        </ToolbarButton>
        <ToolbarButton
          active={editor?.isActive('italic')}
          label="ตัวเอียง (Ctrl+I)"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <Italic size={16} />
        </ToolbarButton>
        <ToolbarButton
          active={editor?.isActive('underline')}
          label="ขีดเส้นใต้ (Ctrl+U)"
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
        >
          <Underline size={16} />
        </ToolbarButton>
        <ToolbarButton
          active={editor?.isActive('link')}
          label="เพิ่มลิงก์ (Ctrl+K)"
          onClick={handleLinkAction}
        >
          <Link2 size={16} />
        </ToolbarButton>
        <ToolbarButton
          disabled={!onImageUpload || isImageBusy}
          label={isImageBusy ? 'กำลังอัปโหลดรูปภาพ' : 'อัปโหลดรูปภาพ'}
          onClick={() => imageInputRef.current?.click()}
        >
          {isImageBusy ? (
            <span className="rich-text-editor__spinner" aria-hidden="true" />
          ) : (
            <ImagePlus size={16} />
          )}
        </ToolbarButton>
        <ToolbarButton
          label="ล้างรูปแบบข้อความ"
          onClick={handleClearFormatting}
        >
          <Eraser size={16} />
        </ToolbarButton>

        <label className="rich-text-editor__color" htmlFor={colorInputId} title="เลือกสีข้อความ">
          <Palette size={16} />
          <span className="sr-only">เลือกสีข้อความ</span>
          <span
            className="rich-text-editor__color-swatch"
            style={{ backgroundColor: activeColor }}
            aria-hidden="true"
          />
          <input
            id={colorInputId}
            type="color"
            value={activeColor}
            onChange={handleColorChange}
          />
        </label>

        <input
          id={imageInputId}
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageSelection}
        />
      </div>

      <div
        className={`rich-text-editor__surface ${isDragActive ? 'is-drag-active' : ''}`}
        onKeyDown={handleEditorKeyDown}
      >
        {isDragActive && (
          <div className="rich-text-editor__drop-indicator">
            วางรูปภาพที่นี่เพื่ออัปโหลดเข้าเนื้อหา
          </div>
        )}
        <EditorContent
          editor={editor}
          style={{ minHeight }}
        />
      </div>
    </div>
  );
};

export default RichTextEditor;
