'use client';

import { tagVocabulary } from '../../lib/tags';
import { useCallback, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { discardDraftAction, publishNowAction, saveDraftAction, submitForReviewAction } from '../../routes/actions';
import type { DraftStatus } from '../../review/types';
import type { EditorFields } from '../../lib/types';
import type { LinkIndex } from '../../lib/wikilinks';
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
import { RestoreBanner } from './RestoreBanner';
import { removeBackup, useLocalBackup } from './useLocalBackup';
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
  /** Set when the editor sits in the review queue's right pane: the queue tab to go back to. */
  queueList?: string;
}

interface Backup {
  fields: EditorFields;
  folder: string;
  slug: string;
}

function isFields(value: unknown): value is EditorFields {
  const f = value as EditorFields | null;
  return (
    !!f &&
    typeof f.title === 'string' &&
    typeof f.description === 'string' &&
    typeof f.type === 'string' &&
    typeof f.body === 'string' &&
    Array.isArray(f.tags)
  );
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
  const tagVocab = useMemo(() => tagVocabulary(props.linkIndex.docs), [props.linkIndex]);
  const [saving, startSave] = useTransition();

  const [fields, setFields] = useState<EditorFields>(props.initial);
  const [saved, setSaved] = useState<EditorFields>(props.initial);
  const [revision, setRevision] = useState<number | null>(props.revision);
  const [mode, setMode] = useState<EditorMode>('visual');
  const [dialog, setDialog] = useState<SubmitMode | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  // The last save failure, kept on screen until the next successful save.
  const [saveError, setSaveError] = useState<string | null>(null);

  // Set once a new document's first save lands: the path is fixed from then on.
  const [savedId, setSavedId] = useState<string | null>(null);
  const pathLocked = props.docId !== null || savedId !== null;
  const [folder, setFolder] = useState(props.defaultFolder);
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  // Field errors stay hidden until the first attempt to save.
  const [showErrors, setShowErrors] = useState(false);

  const docId =
    props.docId ?? savedId ?? [folder.replace(/\/+$/, ''), slug.replace(/-+$/, '')].filter(Boolean).join('/');
  const dirty = !sameFields(fields, saved) || (!pathLocked && fields.title.trim() !== '');
  const pending = saving || actionPending;
  const locked = props.lockedReason !== null;

  const existingIds = useMemo(() => new Set(props.linkIndex.docs.map((d) => d.id)), [props.linkIndex]);
  const titleError = fields.title.trim() ? null : 'Give the document a title.';
  const pathError = pathLocked
    ? null
    : !slug.replace(/-+$/, '')
      ? 'Choose a file name for the new document.'
      : existingIds.has(docId)
        ? `A document already exists at ${docId}.md — choose another name.`
        : null;

  const backupKey = `skynest.backup.${vaultId}.${props.docId ?? savedId ?? '__new__'}`;
  const backup = useLocalBackup<Backup>(
    backupKey,
    { fields, folder, slug },
    dirty,
    (v): v is Backup => {
      const b = v as Backup | null;
      return !!b && isFields(b.fields) && typeof b.folder === 'string' && typeof b.slug === 'string' && !sameFields(b.fields, props.initial);
    },
  );
  const restore = () => {
    if (!backup.offer) return;
    const { value } = backup.offer;
    setFields(value.fields);
    if (!pathLocked) {
      setFolder(value.folder);
      setSlug(value.slug);
      setSlugTouched(true);
    }
    backup.dismissOffer();
  };

  const update = useCallback(<K extends keyof EditorFields>(key: K, value: EditorFields[K]) => {
    setFields((f) => ({ ...f, [key]: value }));
  }, []);

  const setBody = useCallback((body: string) => update('body', body), [update]);

  const onTitleChange = (title: string) => {
    update('title', title);
    if (!pathLocked && !slugTouched) setSlug(slugify(title));
  };

  const check = (): boolean => {
    const error = titleError ?? pathError;
    if (!error) return true;
    setShowErrors(true);
    toast.show(error, 'error');
    return false;
  };

  const openDialog = (next: SubmitMode) => {
    if (!check()) return;
    if (!dirty && revision === null) {
      toast.show('Make a change first — there’s nothing to submit yet.', 'error');
      return;
    }
    setDialog(next);
  };

  const inQueue = props.queueList !== undefined;
  const input = () => ({ docId, isNew: props.isNew, fields, expectedRevision: revision, queueList: props.queueList });

  const save = () => {
    if (locked || pending || !dirty || !check()) return;
    startSave(async () => {
      const result = await saveDraftAction(vaultId, input());
      if (!result.ok) {
        toast.show(result.error, 'error');
        setSaveError(result.error);
        return;
      }
      setSaveError(null);
      setSaved(fields);
      setRevision(result.revision ?? null);
      toast.show('Draft saved');
      // A new document now exists as a draft. Fix its path and show its permanent
      // edit URL without a navigation, which would remount the editor mid-edit.
      if (!pathLocked) {
        setSavedId(docId);
        window.history.replaceState(null, '', urls.edit(docId));
      }
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
    removeBackup(backupKey);
    if (inQueue) {
      router.push(urls.reviewDraft(docId, undefined, props.queueList || undefined));
      return;
    }
    router.push(pathLocked ? urls.doc(docId) : urls.browse({ folder: props.defaultFolder || undefined }));
  };

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col">
      <div className={`${inQueue ? 'px-4 sm:px-6 lg:px-8' : PAGE_CONTAINER} flex-1 py-6`}>
        {backup.offer && !locked && (
          <RestoreBanner savedAt={backup.offer.savedAt} onRestore={restore} onDismiss={backup.dismissOffer} />
        )}
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
          tagVocabulary={tagVocab}
          disabled={locked}
          titleError={showErrors ? titleError : null}
          pathError={showErrors ? pathError : null}
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
        error={saveError}
        canSubmit={dirty || revision !== null}
        status={props.status}
        isReviewer={props.isReviewer}
        canSave={!locked}
        containerClass={inQueue ? 'px-4 sm:px-6 lg:px-8' : undefined}
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
        description={
          props.isNew
            ? 'This document has never been published, so discarding the draft deletes it entirely, along with its comments.'
            : 'All unpublished changes in this draft — including its comments — will be deleted. The published document is not affected.'
        }
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
      />
    </div>
  );
}
