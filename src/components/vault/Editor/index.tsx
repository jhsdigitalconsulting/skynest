'use client';

import { useCallback, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { discardDraftAction, publishNowAction, saveDraftAction, submitForReviewAction } from '@/app/vault/actions';
import type { DraftStatus } from '@/lib/review/types';
import type { EditorFields } from '@/lib/vault-ui/types';
import type { LinkIndex } from '@/lib/vault-ui/wikilinks';
import { Dialog } from '../Dialog';
import { Icon } from '../Icon';
import { useToast } from '../Toaster/context';
import { buttonClass } from '../button-styles';
import { PAGE_CONTAINER } from '../layout-styles';
import { useVaultAction } from '../useVaultAction';
import { ActionBar } from './ActionBar';
import { MarkdownPane } from './MarkdownPane';
import { ModeSwitch } from './ModeSwitch';
import type { EditorMode } from './ModeSwitch';
import { MetaFields } from './MetaFields';
import { SubmitDialog } from './SubmitDialog';
import { VisualPane } from './VisualPane';
import type { SubmitMode } from './SubmitDialog';
import { slugify } from './PathField';
import { useEditorGuards } from './useEditorGuards';
import { useVaultId, useVaultUrls } from '../useVault';

export interface EditorProps {
  /** Null for a brand-new document whose path hasn't been chosen yet. */
  docId: string | null;
  isNew: boolean;
  initial: EditorFields;
  /** Draft revision loaded, or null when editing the published document directly. */
  revision: number | null;
  status: DraftStatus | null;
  isReviewer: boolean;
  defaultFolder: string;
  folders: string[];
  /** Set when this viewer may not change the draft (e.g. someone else's draft in review). */
  lockedReason: string | null;
  /** Every linkable document: resolves `[[wikilinks]]` in the preview and feeds the document picker. */
  linkIndex: LinkIndex;
}

function sameFields(a: EditorFields, b: EditorFields): boolean {
  return (
    a.title === b.title &&
    a.description === b.description &&
    a.type === b.type &&
    a.body === b.body &&
    a.tags.join('\u0000') === b.tags.join('\u0000')
  );
}

export function Editor(props: EditorProps) {
  const router = useRouter();
  const toast = useToast();
  const { run, pending: actionPending } = useVaultAction();
  const vaultId = useVaultId();
  const links = useMemo(() => ({ vaultId, index: props.linkIndex }), [vaultId, props.linkIndex]);
  const urls = useVaultUrls();
  const [saving, startSave] = useTransition();

  const [fields, setFields] = useState<EditorFields>(props.initial);
  const [saved, setSaved] = useState<EditorFields>(props.initial);
  const [revision, setRevision] = useState<number | null>(props.revision);
  const [mode, setMode] = useState<EditorMode>('visual');
  const [dialog, setDialog] = useState<SubmitMode | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const pathLocked = props.docId !== null;
  const [folder, setFolder] = useState(props.defaultFolder);
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);

  const docId = props.docId ?? [folder.replace(/\/+$/, ''), slug].filter(Boolean).join('/');
  const dirty = !sameFields(fields, saved) || (!pathLocked && fields.title.trim() !== '');
  const pending = saving || actionPending;
  const locked = props.lockedReason !== null;

  const update = useCallback(<K extends keyof EditorFields>(key: K, value: EditorFields[K]) => {
    setFields((f) => ({ ...f, [key]: value }));
  }, []);

  const setBody = useCallback((body: string) => update('body', body), [update]);

  const onTitleChange = (title: string) => {
    update('title', title);
    if (!pathLocked && !slugTouched) setSlug(slugify(title));
  };

  const check = (): boolean => {
    if (!fields.title.trim()) {
      toast.show('Give the document a title first.', 'error');
      return false;
    }
    if (!pathLocked && !slug.trim()) {
      toast.show('Choose a file name for the new document.', 'error');
      return false;
    }
    return true;
  };

  const openDialog = (next: SubmitMode) => {
    if (!check()) return;
    if (!dirty && revision === null) {
      toast.show('Make a change first — there’s nothing to submit yet.', 'error');
      return;
    }
    setDialog(next);
  };

  const input = () => ({ docId, isNew: props.isNew, fields, expectedRevision: revision });

  const save = () => {
    if (locked || pending || !dirty || !check()) return;
    startSave(async () => {
      const result = await saveDraftAction(vaultId, input());
      if (!result.ok) {
        toast.show(result.error, 'error');
        return;
      }
      setSaved(fields);
      setRevision(result.revision ?? null);
      toast.show('Draft saved');
      // A new document now exists as a draft; move to its permanent edit URL.
      if (!pathLocked) router.replace(urls.edit(docId));
    });
  };

  useEditorGuards(dirty && !pending, save);

  const confirm = (note: string) => {
    if (!check()) return;
    const action =
      dialog === 'publish'
        ? () => publishNowAction(vaultId, { ...input(), note: note || undefined })
        : () => submitForReviewAction(vaultId, { ...input(), message: note || undefined });
    run(action, (result) => {
      if (result.ok) {
        setSaved(fields);
        setDialog(null);
      }
    });
  };

  const cancel = () => {
    if (dirty && !window.confirm('Discard your unsaved changes?')) return;
    router.push(pathLocked ? urls.doc(docId) : urls.browse({ folder: props.defaultFolder || undefined }));
  };

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col">
      <div className={`${PAGE_CONTAINER} flex-1 py-6`}>
        {props.lockedReason && (
          <div className="mb-5 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <Icon name="lock" className="mt-0.5 h-4 w-4 shrink-0" />
            {props.lockedReason}
          </div>
        )}
        <MetaFields
          fields={fields}
          isNew={props.isNew}
          pathLocked={pathLocked}
          docId={docId}
          folder={folder}
          slug={slug}
          folders={props.folders}
          disabled={locked}
          onTitleChange={onTitleChange}
          onChange={update}
          onFolderChange={setFolder}
          onSlugChange={(s) => {
            setSlugTouched(true);
            setSlug(s);
          }}
        />
        <div className="mt-6">
          {mode === 'visual' ? (
            <VisualPane
              value={fields.body}
              onChange={setBody}
              disabled={locked}
              controls={<ModeSwitch mode={mode} onChange={setMode} />}
              links={links}
            />
          ) : (
            <MarkdownPane
              value={fields.body}
              onChange={setBody}
              mode={mode}
              onModeChange={setMode}
              disabled={locked}
              links={links}
            />
          )}
        </div>
      </div>

      <ActionBar
        dirty={dirty}
        pending={pending}
        revision={revision}
        status={props.status}
        isReviewer={props.isReviewer}
        canSave={!locked}
        onSave={save}
        onSubmit={() => openDialog('submit')}
        onPublish={() => openDialog('publish')}
        onCancel={cancel}
        onDiscard={revision !== null && !locked ? () => setConfirmDiscard(true) : null}
      />

      <SubmitDialog mode={dialog} pending={pending} onClose={() => setDialog(null)} onConfirm={confirm} />
      <Dialog
        open={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        title="Discard this draft?"
        description="All unpublished changes in this draft — including its comments — will be deleted. The published document is not affected."
        footer={
          <>
            <button type="button" onClick={() => setConfirmDiscard(false)} className={buttonClass('ghost')}>
              Keep editing
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(
                  () => discardDraftAction(vaultId, docId),
                  (r) => {
                    if (r.ok) {
                      setSaved(fields);
                      setConfirmDiscard(false);
                    }
                  },
                )
              }
              className={buttonClass('danger')}
            >
              Discard draft
            </button>
          </>
        }
      >
        {null}
      </Dialog>
    </div>
  );
}
