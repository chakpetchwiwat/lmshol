import React from 'react';
import { AlignCenter, AlignLeft, AlignRight } from 'lucide-react';
import Image from '@tiptap/extension-image';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';

const MIN_IMAGE_WIDTH = 120;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const RichTextImageView = ({
  editor,
  getPos,
  node,
  selected,
  updateAttributes,
}) => {
  const imageRef = React.useRef(null);
  const [isResizing, setIsResizing] = React.useState(false);

  const alignment = node.attrs.dataAlign || 'center';
  const width = Number.parseInt(node.attrs.width, 10) || null;

  const imageStyle = React.useMemo(() => (
    width
      ? { width: `${width}px` }
      : { width: 'min(100%, 720px)' }
  ), [width]);

  const setSelectedNode = () => {
    const position = typeof getPos === 'function' ? getPos() : null;
    if (typeof position !== 'number') return;
    editor.commands.setNodeSelection(position);
  };

  const handleAlign = (dataAlign) => {
    setSelectedNode();
    updateAttributes({ dataAlign });
  };

  const handleResizeStart = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedNode();
    setIsResizing(true);

    const pointerId = event.pointerId;
    const editorElement = imageRef.current?.closest('.ProseMirror');
    const startingWidth = imageRef.current?.getBoundingClientRect().width || width || 320;
    const maxWidth = Math.max(
      MIN_IMAGE_WIDTH,
      Math.floor(editorElement?.getBoundingClientRect().width || startingWidth),
    );
    const startX = event.clientX;

    const handlePointerMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const nextWidth = Math.round(clamp(startingWidth + deltaX, MIN_IMAGE_WIDTH, maxWidth));
      updateAttributes({ width: nextWidth });
    };

    const handlePointerEnd = () => {
      setIsResizing(false);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerEnd);
      window.removeEventListener('pointercancel', handlePointerEnd);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerEnd);
    window.addEventListener('pointercancel', handlePointerEnd);

    event.currentTarget.setPointerCapture?.(pointerId);
  };

  return (
    <NodeViewWrapper
      className={`rich-text-image-block ${selected ? 'is-selected' : ''} ${isResizing ? 'is-resizing' : ''}`}
      data-align={alignment}
      contentEditable={false}
      onClick={setSelectedNode}
    >
      <div className="rich-text-image-frame">
        <img
          ref={imageRef}
          src={node.attrs.src}
          alt={node.attrs.alt || ''}
          title={node.attrs.title || ''}
          width={width || undefined}
          data-align={alignment}
          style={imageStyle}
          draggable="false"
        />

        <div className="rich-text-image-toolbar">
          <button
            type="button"
            className="rich-text-image-toolbar__button"
            data-active={alignment === 'left'}
            onClick={() => handleAlign('left')}
            aria-label="จัดรูปชิดซ้าย"
            title="จัดรูปชิดซ้าย"
          >
            <AlignLeft size={15} />
          </button>
          <button
            type="button"
            className="rich-text-image-toolbar__button"
            data-active={alignment === 'center'}
            onClick={() => handleAlign('center')}
            aria-label="จัดรูปกึ่งกลาง"
            title="จัดรูปกึ่งกลาง"
          >
            <AlignCenter size={15} />
          </button>
          <button
            type="button"
            className="rich-text-image-toolbar__button"
            data-active={alignment === 'right'}
            onClick={() => handleAlign('right')}
            aria-label="จัดรูปชิดขวา"
            title="จัดรูปชิดขวา"
          >
            <AlignRight size={15} />
          </button>
        </div>

        <button
          type="button"
          className="rich-text-image-resize-handle"
          onPointerDown={handleResizeStart}
          aria-label="ปรับขนาดรูปภาพ"
          title="ลากเพื่อปรับขนาด"
        />
      </div>
    </NodeViewWrapper>
  );
};

const RichTextImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) => element.getAttribute('width'),
        renderHTML: (attributes) => (
          attributes.width ? { width: attributes.width } : {}
        ),
      },
      dataAlign: {
        default: 'center',
        parseHTML: (element) => element.getAttribute('data-align') || 'center',
        renderHTML: (attributes) => (
          attributes.dataAlign ? { 'data-align': attributes.dataAlign } : {}
        ),
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(RichTextImageView);
  },
});

export default RichTextImage;
