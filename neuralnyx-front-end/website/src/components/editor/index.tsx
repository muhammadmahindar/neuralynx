import { Plate, usePlateEditor, type PlateEditor, createPlateEditor } from 'platejs/react';
import { Editor, EditorContainer } from '@/components/ui/editor';
import { EditorKit } from './editor-kit';
import { MarkdownPlugin } from '@platejs/markdown';
import { } from 'platejs';
import { type Value } from 'platejs';
import { useEffect } from 'react';

export const MarkdownEditor = ({
    content,
    onChange,
}: {
    content: Value;
    onChange: (value: Value) => void;
}) => {
    const editor = usePlateEditor({
        plugins: EditorKit,
        value: content,
    });

    // Update editor content when the content prop changes
    useEffect(() => {
        if (content && editor && JSON.stringify(editor.children) !== JSON.stringify(content)) {
            editor.tf.setValue(content);
        }
    }, [content, editor]);

    const handleChange = ({ value }: { value: Value, editor: PlateEditor }) => {
        console.log(value);
        onChange(value);
    };

    return (
        <Plate editor={editor} onValueChange={handleChange}>
            <EditorContainer variant="default">
                <Editor variant="custom" placeholder="Start writing your content here..." />
            </EditorContainer>
        </Plate>
    );
};

export const markdownToValue = (markdown: string) => {
    const editor = createPlateEditor({
        plugins: [MarkdownPlugin],
    });
    return editor.getApi(MarkdownPlugin).markdown.deserialize(markdown);
};

export const valueToMarkdown = (value: Value) => {
    const editor = createPlateEditor({
        plugins: [MarkdownPlugin],
    });
    return editor.getApi(MarkdownPlugin).markdown.serialize({ value });
};