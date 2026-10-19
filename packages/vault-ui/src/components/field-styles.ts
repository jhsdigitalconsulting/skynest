/** One look for every text field (metadata, dialogs, comments): px-3 inner padding, with heights, borders and focus states that can't drift apart. */

const FRAME_BASE =
  'rounded-lg bg-white text-sm text-gray-900 shadow-sm outline outline-1 -outline-offset-1 outline-gray-300 transition-colors';

/** The border of a field made of several parts (chips, prefixes, suffixes); the outline paints above them. */
export const FIELD_FRAME = `${FRAME_BASE} focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-indigo-500`;

/** A single-element field (text input, select). */
export const FIELD_INPUT = `block h-10 w-full px-3 placeholder:text-gray-400 ${FRAME_BASE} hover:outline-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 disabled:bg-gray-50 disabled:text-gray-500 disabled:shadow-none disabled:hover:outline-gray-300`;

/** A multi-line field: the same frame and 12px side padding as FIELD_INPUT, with vertical padding in place of a fixed height. */
export const FIELD_TEXTAREA = FIELD_INPUT.replace('h-10 ', 'py-2 ');

export const FIELD_LABEL = 'mb-1.5 block text-xs font-medium text-gray-500';
